package com.alquilaya.serviciousuarios.outbox.publisher;

import com.alquilaya.serviciousuarios.outbox.entity.OutboxEvent;
import com.alquilaya.serviciousuarios.outbox.envelope.EventEnvelope;
import com.alquilaya.serviciousuarios.outbox.envelope.EventEnvelopeBuilder;
import com.alquilaya.serviciousuarios.outbox.repository.OutboxRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * API canónica que la lógica de negocio usa para emitir eventos a Kafka.
 *
 * <p>El método {@link #publicar} persiste la fila en {@code outbox_events}
 * dentro de la transacción del caller — NO toca Kafka directamente. El
 * scheduler ({@link com.alquilaya.serviciousuarios.outbox.scheduler.OutboxScheduler})
 * drena la tabla con backoff y reintentos.
 */
@Service
@RequiredArgsConstructor
public class OutboxPublisher {

    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    @Value("${spring.application.name}")
    private String applicationName;

    /**
     * Persiste un evento en la outbox. Llamar dentro de la {@code @Transactional}
     * de la operación de negocio.
     *
     * @param topic         nombre del topic Kafka destino
     * @param eventType     tipo canónico del catálogo §04
     * @param aggregateType tipo del agregado raíz que cambió (ej. "Usuario")
     * @param aggregateId   ID del agregado serializado como string
     * @param payload       sub-payload del evento (DTO o Map); no debe ser null
     * @param correlationId hilo de la operación de negocio (puede ser null)
     */
    public void publicar(String topic, String eventType,
                         String aggregateType, String aggregateId,
                         Object payload, String correlationId) {
        EventEnvelope env = EventEnvelopeBuilder.builder()
                .eventType(eventType)
                .aggregateType(aggregateType)
                .aggregateId(aggregateId)
                .source(applicationName)
                .correlationId(correlationId)
                .payload(payload)
                .build();

        try {
            String json = objectMapper.writeValueAsString(env);
            outboxRepository.save(OutboxEvent.builder()
                    .eventId(env.getEventId())
                    .aggregateType(aggregateType)
                    .aggregateId(aggregateId)
                    .eventType(eventType)
                    .topic(topic)
                    .payload(json)
                    .build());
        } catch (JsonProcessingException e) {
            // Falla de serialización → tira la transacción de negocio.
            // Es lo correcto: mejor abortar que dejar estado inconsistente.
            throw new IllegalStateException("No se pudo serializar evento " + eventType, e);
        }
    }
}
