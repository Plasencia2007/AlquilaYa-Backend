package com.alquilaya.serviciopropiedades.kafka;

import com.alquilaya.serviciopropiedades.kafka.idempotency.service.IdempotencyService;
import com.alquilaya.serviciopropiedades.outbox.envelope.EventEnvelope;
import com.alquilaya.serviciopropiedades.saga.service.SagaReservaPagoService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

/**
 * Consumer de eventos de pago. Procesa:
 *  - Envelope canónico {@code {"eventType":"PAGO_EXITOSO", ...}} (formato Ola 2).
 *  - Legacy string {@code "PAGO_EXITOSO:{reservaId}"} (formato anterior).
 *
 * Para envelopes nuevos se aplica idempotencia vía {@link IdempotencyService}.
 * Para mensajes legacy se mantiene la lógica histórica sin idempotencia robusta
 * (rama a retirar en Ola 4).
 *
 * En caso de fallo en la lógica, el payload original se reenvía al topic
 * {@code pagos-topic-dlq} con headers de diagnóstico.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PagoEventListener {

    public static final String TOPIC_ORIGEN = "pagos-topic";
    public static final String TOPIC_DLQ = "pagos-topic-dlq";
    public static final String CONSUMER_NAME = "propiedades-pagos-topic";

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final IdempotencyService idempotencyService;
    private final SagaReservaPagoService sagaReservaPagoService;

    @KafkaListener(topics = TOPIC_ORIGEN, groupId = "propiedades-group")
    @Transactional
    public void escucharPagos(String mensaje) {
        log.info("Evento de pago recibido: {}", mensaje);
        try {
            procesar(mensaje);
        } catch (Exception ex) {
            log.error("Error procesando evento de pago '{}': {}", mensaje, ex.getMessage(), ex);
            enviarADlq(mensaje, ex);
        }
    }

    private void procesar(String mensaje) {
        if (mensaje == null) {
            throw new IllegalArgumentException("Payload nulo");
        }

        EventEnvelope env = EventEnvelope.parseOrLegacy(mensaje);
        if (env != null) {
            procesarEnvelope(env);
        } else {
            procesarLegacy(mensaje);
        }
    }

    /** Ruta Ola 2: envelope canónico. */
    private void procesarEnvelope(EventEnvelope env) {
        String eventType = env.getEventType();
        if (!"PAGO_EXITOSO".equals(eventType)) {
            log.debug("Evento ignorado por type='{}' (no PAGO_EXITOSO)", eventType);
            return;
        }
        if (!idempotencyService.marcarComoProcesado(env.getEventId(), CONSUMER_NAME)) {
            log.debug("Evento {} ya procesado por {}, ignorado.", env.getEventId(), CONSUMER_NAME);
            return;
        }

        Long reservaId = extraerReservaIdDelPayload(env.getPayload());
        if (reservaId == null) {
            throw new IllegalArgumentException("Envelope PAGO_EXITOSO sin payload.reservaId");
        }
        // Delegamos al orquestador Saga: él decide si transicionar a PAGADA (ruta feliz)
        // o emitir REFUND_REQUERIDO si la reserva fue cancelada/rechazada antes del pago.
        sagaReservaPagoService.manejarPagoExitoso(reservaId, env);
    }

    /** Ruta legacy: string plano {@code "PAGO_EXITOSO:<reservaId>"}. */
    private void procesarLegacy(String mensaje) {
        if (!mensaje.startsWith("PAGO_EXITOSO:")) {
            log.debug("Evento ignorado (no PAGO_EXITOSO legacy): {}", mensaje);
            return;
        }
        String[] partes = mensaje.split(":");
        if (partes.length < 2 || partes[1].isBlank()) {
            throw new IllegalArgumentException("Formato inválido, falta reservaId tras 'PAGO_EXITOSO:'");
        }
        Long reservaId;
        try {
            reservaId = Long.parseLong(partes[1].trim());
        } catch (NumberFormatException nfe) {
            throw new IllegalArgumentException("reservaId no es numérico: '" + partes[1] + "'", nfe);
        }
        // Ruta legacy: la saga también se aplica para evitar divergencia de estado.
        sagaReservaPagoService.manejarPagoExitoso(reservaId, null);
    }

    private Long extraerReservaIdDelPayload(JsonNode payload) {
        if (payload == null || payload.isNull()) return null;
        JsonNode node = payload.get("reservaId");
        if (node == null || node.isNull()) return null;
        if (node.isNumber()) return node.asLong();
        try {
            return Long.parseLong(node.asText().trim());
        } catch (NumberFormatException e) {
            return null;
        }
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
            log.warn("Mensaje enviado a DLQ '{}': {}", TOPIC_DLQ, payloadOriginal);
        } catch (Exception dlqEx) {
            log.error("FALLO al publicar en DLQ '{}'. msg='{}' err={}",
                    TOPIC_DLQ, payloadOriginal, dlqEx.getMessage(), dlqEx);
            throw new RuntimeException("No se pudo publicar en DLQ", dlqEx);
        }
    }
}
