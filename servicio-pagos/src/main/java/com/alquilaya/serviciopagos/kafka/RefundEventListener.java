package com.alquilaya.serviciopagos.kafka;

import com.alquilaya.serviciopagos.services.RefundService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

/**
 * Consume {@code pagos-topic} y ejecuta el reembolso real cuando llega un
 * {@code REFUND_REQUERIDO} emitido por la Saga de servicio-propiedades.
 *
 * <p>El topic también transporta {@code PAGO_EXITOSO}/{@code PAGO_FALLIDO} producidos por
 * este mismo servicio: se ignoran filtrando por {@code eventType}. Usa un grupo de consumidor
 * propio ({@code pagos-refund-group}) para no interferir con el consumidor de propiedades.
 *
 * <p>Ante un error inesperado (JSON inválido con type REFUND pero sin reservaId, fallo de BD)
 * el mensaje va a {@code pagos-topic-dlq}, igual que el consumidor de propiedades. Los rechazos
 * de MercadoPago NO llegan aquí: {@link RefundService} los persiste como {@code REEMBOLSO_FALLIDO}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RefundEventListener {

    public static final String TOPIC_ORIGEN = "pagos-topic";
    public static final String TOPIC_DLQ = "pagos-topic-dlq";
    public static final String EVENT_TYPE = "REFUND_REQUERIDO";

    private final ObjectMapper objectMapper;
    private final RefundService refundService;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @KafkaListener(topics = TOPIC_ORIGEN, groupId = "pagos-refund-group")
    public void escuchar(String mensaje) {
        try {
            procesar(mensaje);
        } catch (Exception ex) {
            log.error("REFUND: error procesando evento '{}': {}", mensaje, ex.getMessage(), ex);
            enviarADlq(mensaje, ex);
        }
    }

    private void procesar(String mensaje) {
        if (mensaje == null || mensaje.isBlank()) {
            return;
        }

        JsonNode env;
        try {
            env = objectMapper.readTree(mensaje);
        } catch (Exception e) {
            // No es un envelope JSON (p.ej. formato legacy de otros eventos). No es un REFUND_REQUERIDO.
            log.debug("REFUND: mensaje no-JSON ignorado: {}", mensaje);
            return;
        }

        String eventType = env.path("eventType").asText(null);
        if (!EVENT_TYPE.equals(eventType)) {
            return; // PAGO_EXITOSO/PAGO_FALLIDO u otros: no nos incumben.
        }

        JsonNode payload = env.path("payload");
        if (!payload.hasNonNull("reservaId")) {
            throw new IllegalArgumentException("REFUND_REQUERIDO sin payload.reservaId: " + mensaje);
        }
        Long reservaId = payload.get("reservaId").asLong();
        String motivo = payload.path("motivo").asText("");
        String correlationId = env.path("correlationId").asText(null);

        log.info("REFUND_REQUERIDO recibido — reserva={} motivo='{}'", reservaId, motivo);
        refundService.procesarRefund(reservaId, motivo, correlationId);
    }

    private void enviarADlq(String payloadOriginal, Throwable causa) {
        try {
            ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC_DLQ, payloadOriginal);
            record.headers()
                    .add("original-topic", TOPIC_ORIGEN.getBytes(StandardCharsets.UTF_8))
                    .add("error-message",
                            (causa.getClass().getSimpleName() + ": " + String.valueOf(causa.getMessage()))
                                    .getBytes(StandardCharsets.UTF_8))
                    .add("failure-timestamp", Instant.now().toString().getBytes(StandardCharsets.UTF_8));
            kafkaTemplate.send(record);
            log.warn("REFUND: mensaje enviado a DLQ '{}': {}", TOPIC_DLQ, payloadOriginal);
        } catch (Exception dlqEx) {
            log.error("REFUND: FALLO al publicar en DLQ '{}'. err={}", TOPIC_DLQ, dlqEx.getMessage(), dlqEx);
        }
    }
}
