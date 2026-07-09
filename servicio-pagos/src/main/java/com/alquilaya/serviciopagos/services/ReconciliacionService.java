package com.alquilaya.serviciopagos.services;

import com.alquilaya.serviciopagos.entities.Pago;
import com.alquilaya.serviciopagos.repositories.PagoRepository;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.resources.payment.Payment;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Reconciliación con Mercado Pago (G5).
 *
 * <p>Re-consulta contra MP (fuente de verdad) los pagos que quedaron en un estado no
 * resuelto ({@code PENDIENTE_REVISION} o {@code DISCREPANCIA}) —típicamente porque el webhook
 * se perdió o llegó cuando el pago aún estaba en curso— y concilia el estado local:
 * <ul>
 *   <li>{@code approved}  → {@code PAGADO} (+ {@code PAGO_EXITOSO}) o {@code DISCREPANCIA} si el
 *       monto/moneda no cuadra.</li>
 *   <li>{@code rejected} / {@code cancelled} → {@code RECHAZADO} (+ {@code PAGO_FALLIDO}).</li>
 *   <li>{@code refunded} / {@code charged_back} → {@code REEMBOLSADO} (+ {@code REFUND_COMPLETADO}).</li>
 *   <li>{@code pending} / {@code in_process} → se deja para la próxima corrida.</li>
 * </ul>
 *
 * <p>La transición de estado y la emisión de eventos las delega en
 * {@link PagoService#reconciliarPago(Long, Payment)}, que reusa exactamente los mismos emisores
 * del webhook y el <b>outbox</b> transaccional. Este servicio solo orquesta el lote: consulta MP
 * fuera de la transacción, tolera errores por pago (un fallo no aborta el lote) y loguea un
 * resumen por corrida.
 *
 * <p>La re-emisión de eventos varados en el outbox NO es responsabilidad de este servicio: ya la
 * cubre {@code OutboxScheduler.recuperarVarados()} (item P2).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReconciliacionService {

    /** Estados locales "no resueltos" que se re-consultan contra Mercado Pago. */
    static final List<String> ESTADOS_RECONCILIABLES = List.of("PENDIENTE_REVISION", "DISCREPANCIA");

    private final PagoRepository pagoRepository;
    private final PagoService pagoService;

    /** Interruptor global del job programado (el disparo on-demand del admin no se ve afectado). */
    @Value("${pagos.reconciliacion.enabled:true}")
    private boolean habilitada;

    /** Tamaño máximo del lote por corrida (los más antiguos primero). */
    @Value("${pagos.reconciliacion.batch-size:50}")
    private int batchSize;

    /**
     * Job programado. Intervalo y toggle configurables (ver {@code servicio-pagos.yml}).
     * {@code fixedDelay} → no solapa corridas: espera a que termine una para agendar la siguiente.
     */
    @Scheduled(
            fixedDelayString = "${pagos.reconciliacion.interval-ms:900000}",
            initialDelayString = "${pagos.reconciliacion.initial-delay-ms:60000}")
    public void reconciliarProgramado() {
        if (!habilitada) {
            log.debug("Reconciliación programada deshabilitada (pagos.reconciliacion.enabled=false).");
            return;
        }
        int limite = batchSize > 0 ? batchSize : 50;
        List<Pago> candidatos = pagoRepository.findByEstadoInOrderByFechaCreacionAsc(
                ESTADOS_RECONCILIABLES, PageRequest.of(0, limite));
        procesarLote(candidatos, "scheduled");
    }

    /**
     * Disparo on-demand (admin): concilia los pagos no resueltos de una reserva concreta.
     * No depende del toggle {@code enabled}.
     */
    public Resumen reconciliarReserva(Long reservaId) {
        List<Pago> candidatos = pagoRepository.findAllByReservaIdOrderByFechaCreacionDesc(reservaId).stream()
                .filter(p -> ESTADOS_RECONCILIABLES.contains(p.getEstado()))
                .toList();
        return procesarLote(candidatos, "reserva=" + reservaId);
    }

    private Resumen procesarLote(List<Pago> candidatos, String origen) {
        Resumen r = new Resumen();
        r.escaneados = candidatos.size();
        for (Pago pago : candidatos) {
            try {
                procesarPago(pago, r);
            } catch (Exception e) {
                // Un pago problemático no debe abortar el lote.
                r.fallidos++;
                log.error("Reconciliación: error inesperado en pago {} (reserva {}): {}",
                        pago.getId(), pago.getReservaId(), e.getMessage(), e);
            }
        }
        log.info("📊 Reconciliación [{}]: escaneados={} conciliados={} sinCambio={} revisionManual={} fallidos={}",
                origen, r.escaneados, r.conciliados, r.sinCambio, r.revisionManual, r.fallidos);
        return r;
    }

    private void procesarPago(Pago pago, Resumen r) {
        Long mpPaymentId = parsePaymentId(pago);
        if (mpPaymentId == null) {
            // paymentId nulo/no numérico: no se puede consultar MP → revisión manual (DISCREPANCIA).
            log.error("Reconciliación: pago {} (reserva {}) con paymentId inválido '{}'; marcado para revisión manual.",
                    pago.getId(), pago.getReservaId(), pago.getPaymentId());
            pagoService.marcarParaRevisionManual(pago.getId(),
                    "paymentId nulo o no numérico: " + pago.getPaymentId());
            r.revisionManual++;
            return;
        }

        Payment payment;
        try {
            // Fuente de verdad: se consulta MP FUERA de la transacción de conciliación.
            payment = new PaymentClient().get(mpPaymentId);
        } catch (MPApiException e) {
            r.fallidos++;
            log.error("Reconciliación: MPApiException consultando pago {} (paymentId={}) HTTP {}: {}. Se reintentará.",
                    pago.getId(), mpPaymentId, e.getStatusCode(), e.getMessage());
            return;
        } catch (Exception e) {
            r.fallidos++;
            log.error("Reconciliación: error consultando MP para pago {} (paymentId={}): {}. Se reintentará.",
                    pago.getId(), mpPaymentId, e.getMessage());
            return;
        }

        PagoService.ResultadoReconciliacion res = pagoService.reconciliarPago(pago.getId(), payment);
        switch (res) {
            case CONFIRMADO, RECHAZADO, REEMBOLSADO, DISCREPANCIA -> {
                r.conciliados++;
                log.info("Reconciliación: pago {} (reserva {}) → {} (MP status={}).",
                        pago.getId(), pago.getReservaId(), res, payment.getStatus());
            }
            case SIN_CAMBIO, NO_APLICA -> r.sinCambio++;
        }
    }

    private static Long parsePaymentId(Pago pago) {
        String pid = pago.getPaymentId();
        if (pid == null || pid.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(pid.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Contadores de una corrida de reconciliación. */
    public static class Resumen {
        public int escaneados;
        public int conciliados;
        public int sinCambio;
        public int revisionManual;
        public int fallidos;
    }
}
