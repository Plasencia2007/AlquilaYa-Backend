package com.alquilaya.serviciopagos.services;

import com.alquilaya.serviciopagos.entities.Pago;
import com.alquilaya.serviciopagos.outbox.publisher.OutboxPublisher;
import com.alquilaya.serviciopagos.repositories.PagoRepository;
import com.mercadopago.client.payment.PaymentRefundClient;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.resources.payment.PaymentRefund;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Ejecuta reembolsos reales contra MercadoPago cuando la Saga de propiedades emite
 * {@code REFUND_REQUERIDO} (pago recibido sobre una reserva cancelada/rechazada/expirada,
 * o cancelación de una reserva ya pagada).
 *
 * <p>Antes de esto el evento se emitía pero nadie lo consumía: la Saga marcaba la
 * compensación como COMPLETADA sin devolver dinero. Este servicio cierra ese hueco.
 *
 * <h3>Idempotencia</h3>
 * El reembolso se aplica solo a los pagos en estado {@code PAGADO}; al terminar quedan en
 * {@code REEMBOLSADO}. Una re-entrega del evento (Kafka at-least-once) no encuentra pagos
 * PAGADOS y es no-op. Los pagos de una reserva comparten la key Kafka (reservaId), así que
 * el mismo grupo de consumidor los procesa de forma secuencial.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefundService {

    public static final String ESTADO_PAGADO = "PAGADO";
    public static final String ESTADO_REEMBOLSADO = "REEMBOLSADO";
    public static final String ESTADO_REEMBOLSO_FALLIDO = "REEMBOLSO_FALLIDO";

    private static final String TOPIC_PAGOS = "pagos-topic";
    private static final String EVENT_REFUND_COMPLETADO = "REFUND_COMPLETADO";
    private static final String EVENT_REFUND_FALLIDO = "REFUND_FALLIDO";

    private final PagoRepository pagoRepository;
    private final OutboxPublisher outboxPublisher;

    /**
     * Reembolsa todos los pagos PAGADOS de una reserva. No lanza excepción ante un rechazo
     * de MercadoPago: el fallo se persiste en el pago ({@code REEMBOLSO_FALLIDO}) para que un
     * job de reconciliación pueda reintentarlo. Solo propaga errores inesperados (BD, etc.).
     */
    public void procesarRefund(Long reservaId, String motivo, String correlationId) {
        List<Pago> pagados = pagoRepository.findAllByReservaIdOrderByFechaCreacionDesc(reservaId).stream()
                .filter(p -> ESTADO_PAGADO.equals(p.getEstado()))
                .toList();

        if (pagados.isEmpty()) {
            log.info("REFUND: reserva {} sin pagos PAGADOS para reembolsar (idempotente). motivo='{}'",
                    reservaId, motivo);
            return;
        }

        for (Pago pago : pagados) {
            reembolsarPago(pago, motivo, correlationId);
        }
    }

    private void reembolsarPago(Pago pago, String motivo, String correlationId) {
        if (pago.getPaymentId() == null || pago.getPaymentId().isBlank()) {
            log.error("REFUND: pago {} (reserva {}) sin paymentId de MercadoPago; imposible reembolsar.",
                    pago.getId(), pago.getReservaId());
            marcarFallido(pago, "Pago sin paymentId de MercadoPago", correlationId);
            return;
        }

        long mpPaymentId;
        try {
            mpPaymentId = Long.parseLong(pago.getPaymentId().trim());
        } catch (NumberFormatException e) {
            log.error("REFUND: pago {} con paymentId no numérico '{}'.", pago.getId(), pago.getPaymentId());
            marcarFallido(pago, "paymentId no numérico: " + pago.getPaymentId(), correlationId);
            return;
        }

        try {
            // Reembolso TOTAL del pago en MercadoPago. El SDK lee el access-token global
            // configurado en MercadoPagoConfiguration.
            PaymentRefund refund = new PaymentRefundClient().refund(mpPaymentId);
            log.info("REFUND: reembolso OK — pago={} reserva={} paymentId={} refundId={} status={} monto={}",
                    pago.getId(), pago.getReservaId(), mpPaymentId, refund.getId(), refund.getStatus(), pago.getMonto());
            marcarReembolsado(pago, refund, motivo, correlationId);
        } catch (MPApiException apiEx) {
            String detalle = "MercadoPago rechazó el reembolso (HTTP " + apiEx.getStatusCode() + "): " + apiEx.getMessage();
            log.error("REFUND: {} — pago={} reserva={}", detalle, pago.getId(), pago.getReservaId());
            marcarFallido(pago, detalle, correlationId);
        } catch (Exception e) {
            // Transporte/conexión (MPException, IOException) u otro: transitorio. Se persiste
            // como fallido para reconciliación; no se propaga para no bloquear la partición.
            log.error("REFUND: error contactando a MercadoPago — pago={} reserva={} err={}",
                    pago.getId(), pago.getReservaId(), e.getMessage(), e);
            marcarFallido(pago, e.getClass().getSimpleName() + ": " + e.getMessage(), correlationId);
        }
    }

    private void marcarReembolsado(Pago pago, PaymentRefund refund, String motivo, String correlationId) {
        pago.setEstado(ESTADO_REEMBOLSADO);
        pagoRepository.save(pago);

        Map<String, Object> payload = new HashMap<>();
        payload.put("reservaId", pago.getReservaId());
        payload.put("pagoId", pago.getId());
        payload.put("paymentId", pago.getPaymentId());
        payload.put("refundId", String.valueOf(refund.getId()));
        payload.put("montoReembolsado", pago.getMonto());
        payload.put("motivo", motivo != null ? motivo : "");
        outboxPublisher.publicar(TOPIC_PAGOS, EVENT_REFUND_COMPLETADO, "Pago",
                String.valueOf(pago.getId()), payload, correlationId);
    }

    private void marcarFallido(Pago pago, String error, String correlationId) {
        pago.setEstado(ESTADO_REEMBOLSO_FALLIDO);
        pagoRepository.save(pago);

        Map<String, Object> payload = new HashMap<>();
        payload.put("reservaId", pago.getReservaId());
        payload.put("pagoId", pago.getId());
        payload.put("paymentId", pago.getPaymentId());
        payload.put("error", error != null ? error : "");
        outboxPublisher.publicar(TOPIC_PAGOS, EVENT_REFUND_FALLIDO, "Pago",
                String.valueOf(pago.getId()), payload, correlationId);
    }
}
