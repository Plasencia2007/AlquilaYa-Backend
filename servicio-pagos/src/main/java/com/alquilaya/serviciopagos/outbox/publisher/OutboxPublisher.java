package com.alquilaya.serviciopagos.outbox.publisher;

import com.alquilaya.serviciopagos.outbox.entity.OutboxEvent;
import com.alquilaya.serviciopagos.outbox.envelope.EventEnvelope;
import com.alquilaya.serviciopagos.outbox.envelope.EventEnvelopeBuilder;
import com.alquilaya.serviciopagos.outbox.repository.OutboxRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * API canónica de publicación de eventos. La lógica de negocio llama a
 * {@link #publicar(String, String, String, String, Object, String)} dentro de
 * su {@code @Transactional}; el evento queda persistido en {@code outbox_events}
 * y el {@code OutboxScheduler} se encarga de enviarlo a Kafka asincrónicamente.
 */
@Service
@RequiredArgsConstructor
public class OutboxPublisher {

    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    @Value("${spring.application.name}")
    private String applicationName;

    public void publicar(String topic,
                         String eventType,
                         String aggregateType,
                         String aggregateId,
                         Object payload,
                         String correlationId) {
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
            // Falla la transacción de negocio → ROLLBACK. Comportamiento intencional.
            throw new IllegalStateException("No se pudo serializar evento " + eventType, e);
        }
    }
}
