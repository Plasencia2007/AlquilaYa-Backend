package com.alquilaya.serviciopropiedades.outbox.publisher;

import com.alquilaya.serviciopropiedades.outbox.entity.OutboxEvent;
import com.alquilaya.serviciopropiedades.outbox.envelope.EventEnvelope;
import com.alquilaya.serviciopropiedades.outbox.envelope.EventEnvelopeBuilder;
import com.alquilaya.serviciopropiedades.outbox.repository.OutboxRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * API canónica de emisión de eventos en servicio-propiedades.
 *
 * El método {@link #publicar(String, String, String, String, Object, String)} persiste
 * el evento en la tabla outbox_events dentro de la transacción del caller. El
 * scheduler {@link com.alquilaya.serviciopropiedades.outbox.scheduler.OutboxScheduler}
 * lee la tabla periódicamente y publica a Kafka.
 *
 * REGLA DURA: ninguna lógica de negocio debe llamar a kafkaTemplate.send(...) directamente.
 */
@Slf4j
@Service
public class OutboxPublisher {

    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;
    private final String applicationName;

    public OutboxPublisher(OutboxRepository outboxRepository,
                           @Value("${spring.application.name:servicio-propiedades}") String applicationName) {
        this.outboxRepository = outboxRepository;
        this.applicationName = applicationName;
        this.objectMapper = JsonMapper.builder()
                .addModule(new JavaTimeModule())
                .build();
    }

    /**
     * Construye el envelope, lo serializa y persiste en outbox_events.
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
            OutboxEvent saved = outboxRepository.save(OutboxEvent.builder()
                    .eventId(env.getEventId())
                    .aggregateType(aggregateType)
                    .aggregateId(aggregateId)
                    .eventType(eventType)
                    .topic(topic)
                    .payload(json)
                    .attempts(0)
                    .build());
            log.debug("Outbox persistido id={} eventId={} type={} topic={}",
                    saved.getId(), saved.getEventId(), eventType, topic);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo serializar evento " + eventType, e);
        }
    }
}
