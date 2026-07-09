package com.alquilaya.serviciopagos.services;

import com.alquilaya.serviciopagos.clients.ReservasClient;
import com.alquilaya.serviciopagos.dto.ReservaDetalleDTO;
import com.alquilaya.serviciopagos.entities.Deposito;
import com.alquilaya.serviciopagos.repositories.DepositoRepository;
import com.mercadopago.client.payment.PaymentRefundClient;
import com.mercadopago.exceptions.MPApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * G3: garantía / depósito de una reserva — captura, retención, devolución (total/parcial) o
 * pérdida. V1 admin-mediado, igual filosofía que {@link DesembolsoService}: el depósito se
 * captura hoy junto con la renta o por un canal externo (NO se separó el cobro en el webhook
 * de pagos — es un flujo de dinero real ya probado, tocarlo a ciegas es más riesgo del que
 * vale este alcance). La DEVOLUCIÓN sí ejecuta un reembolso real en MercadoPago cuando el
 * depósito tiene un {@code paymentId} asociado (reusa el mismo patrón que {@link RefundService}).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DepositoService {

    private final DepositoRepository depositoRepository;
    private final ReservasClient reservasClient;

    /** Crea el depósito PENDIENTE de una reserva (un admin lo registra al aprobarla/cobrarla). */
    @Transactional
    public Deposito crear(Long reservaId, BigDecimal monto) {
        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto del depósito debe ser mayor a cero");
        }
        Long arrendadorId = null;
        try {
            ReservaDetalleDTO reserva = reservasClient.obtenerReserva(reservaId);
            arrendadorId = reserva != null ? reserva.getArrendadorId() : null;
        } catch (Exception e) {
            log.warn("[Deposito] No se pudo obtener arrendadorId de la reserva {}: {}", reservaId, e.getMessage());
        }
        Deposito d = Deposito.builder()
                .reservaId(reservaId)
                .arrendadorId(arrendadorId)
                .monto(monto.setScale(2, RoundingMode.HALF_UP))
                .estado("PENDIENTE")
                .build();
        return depositoRepository.save(d);
    }

    /** Confirma que el depósito se cobró (junto con la renta o por un canal externo). Idempotente. */
    @Transactional
    public Deposito capturar(Long depositoId, String paymentId) {
        Deposito d = obtener(depositoId);
        if ("RETENIDO".equals(d.getEstado())) {
            return d; // idempotente
        }
        if (!"PENDIENTE".equals(d.getEstado())) {
            throw new IllegalStateException("Sólo un depósito PENDIENTE puede capturarse (estado actual: " + d.getEstado() + ")");
        }
        d.setEstado("RETENIDO");
        d.setPaymentId(paymentId);
        log.info("💰 [Deposito] #{} capturado (reserva {}, S/ {}, paymentId={})",
                depositoId, d.getReservaId(), d.getMonto(), paymentId);
        return depositoRepository.save(d);
    }

    /** Devuelve el depósito completo al estudiante (fin de contrato sin daños). */
    @Transactional
    public Deposito devolver(Long depositoId) {
        Deposito d = obtener(depositoId);
        if ("DEVUELTO".equals(d.getEstado())) {
            return d; // idempotente
        }
        exigirRetenido(d);
        if (d.getPaymentId() != null && !d.getPaymentId().isBlank()) {
            ejecutarReembolsoMp(d, null); // null = reembolso total
        }
        d.setEstado("DEVUELTO");
        d.setMontoDevuelto(d.getMonto());
        log.info("✅ [Deposito] #{} devuelto completo (reserva {}, S/ {})", depositoId, d.getReservaId(), d.getMonto());
        return depositoRepository.save(d);
    }

    /** El arrendador retiene parte del depósito por daños; el resto se devuelve. */
    @Transactional
    public Deposito retenerParcial(Long depositoId, BigDecimal montoRetenido, String motivo) {
        Deposito d = obtener(depositoId);
        if ("RETENIDO_PARCIAL".equals(d.getEstado())) {
            return d; // idempotente
        }
        exigirRetenido(d);
        if (montoRetenido == null || montoRetenido.compareTo(BigDecimal.ZERO) <= 0
                || montoRetenido.compareTo(d.getMonto()) >= 0) {
            throw new IllegalArgumentException(
                    "El monto retenido debe ser mayor a 0 y menor al depósito total (S/ " + d.getMonto()
                            + "); si es el total usa 'perder', no 'retener-parcial'");
        }
        BigDecimal aDevolver = d.getMonto().subtract(montoRetenido).setScale(2, RoundingMode.HALF_UP);
        if (d.getPaymentId() != null && !d.getPaymentId().isBlank()) {
            ejecutarReembolsoMp(d, aDevolver);
        }
        d.setEstado("RETENIDO_PARCIAL");
        d.setMontoDevuelto(aDevolver);
        d.setMotivoRetencion(motivo);
        log.info("⚠️ [Deposito] #{} retención parcial: se queda S/ {} de S/ {} ({})",
                depositoId, montoRetenido, d.getMonto(), motivo);
        return depositoRepository.save(d);
    }

    /** El arrendador se queda el depósito completo por daños graves / incumplimiento. */
    @Transactional
    public Deposito marcarPerdido(Long depositoId, String motivo) {
        Deposito d = obtener(depositoId);
        if ("PERDIDO".equals(d.getEstado())) {
            return d; // idempotente
        }
        exigirRetenido(d);
        d.setEstado("PERDIDO");
        d.setMontoDevuelto(BigDecimal.ZERO);
        d.setMotivoRetencion(motivo);
        log.warn("❌ [Deposito] #{} PERDIDO íntegro (reserva {}, S/ {}, motivo: {})",
                depositoId, d.getReservaId(), d.getMonto(), motivo);
        return depositoRepository.save(d);
    }

    private void ejecutarReembolsoMp(Deposito d, BigDecimal montoParcial) {
        long mpPaymentId;
        try {
            mpPaymentId = Long.parseLong(d.getPaymentId().trim());
        } catch (NumberFormatException e) {
            throw new IllegalStateException("El depósito #" + d.getId() + " tiene un paymentId no numérico: " + d.getPaymentId());
        }
        try {
            if (montoParcial != null) {
                new PaymentRefundClient().refund(mpPaymentId, montoParcial);
            } else {
                new PaymentRefundClient().refund(mpPaymentId);
            }
        } catch (MPApiException apiEx) {
            throw new IllegalStateException("MercadoPago rechazó el reembolso del depósito #" + d.getId()
                    + " (HTTP " + apiEx.getStatusCode() + "): " + apiEx.getMessage(), apiEx);
        } catch (Exception e) {
            throw new IllegalStateException("Error contactando a MercadoPago para el depósito #" + d.getId()
                    + ": " + e.getMessage(), e);
        }
    }

    private void exigirRetenido(Deposito d) {
        if (!"RETENIDO".equals(d.getEstado())) {
            throw new IllegalStateException("El depósito debe estar RETENIDO para esta acción (estado actual: " + d.getEstado() + ")");
        }
    }

    @Transactional(readOnly = true)
    public List<Deposito> historialDeReserva(Long reservaId) {
        return depositoRepository.findByReservaIdOrderByFechaCreacionDesc(reservaId);
    }

    @Transactional(readOnly = true)
    public List<Deposito> historialDelArrendador(Long arrendadorId) {
        return depositoRepository.findByArrendadorIdOrderByFechaCreacionDesc(arrendadorId);
    }

    @Transactional(readOnly = true)
    public Deposito obtener(Long id) {
        return depositoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Depósito no encontrado: " + id));
    }
}
