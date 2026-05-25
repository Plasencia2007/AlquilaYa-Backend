package com.alquilaya.serviciousuarios.outbox.envelope;

import java.time.Instant;
import java.util.UUID;

/**
 * Fábrica canónica del {@link EventEnvelope}.
 *
 * <p>Centraliza la generación de {@code eventId} (UUID v4) y {@code occurredAt}
 * (UTC) para que ningún caller deba recordar esos detalles.
 */
public final class EventEnvelopeBuilder {

    private static final int DEFAULT_EVENT_VERSION = 1;

    private String eventType;
    private String aggregateType;
    private String aggregateId;
    private String source;
    private String correlationId;
    private Object payload;
    private Integer eventVersion;

    private EventEnvelopeBuilder() {}

    public static EventEnvelopeBuilder builder() {
        return new EventEnvelopeBuilder();
    }

    public EventEnvelopeBuilder eventType(String eventType) {
        this.eventType = eventType;
        return this;
    }

    public EventEnvelopeBuilder aggregateType(String aggregateType) {
        this.aggregateType = aggregateType;
        return this;
    }

    public EventEnvelopeBuilder aggregateId(String aggregateId) {
        this.aggregateId = aggregateId;
        return this;
    }

    public EventEnvelopeBuilder source(String source) {
        this.source = source;
        return this;
    }

    public EventEnvelopeBuilder correlationId(String correlationId) {
        this.correlationId = correlationId;
        return this;
    }

    public EventEnvelopeBuilder payload(Object payload) {
        this.payload = payload;
        return this;
    }

    public EventEnvelopeBuilder eventVersion(Integer eventVersion) {
        this.eventVersion = eventVersion;
        return this;
    }

    public EventEnvelope build() {
        if (eventType == null || eventType.isBlank()) {
            throw new IllegalStateException("eventType es obligatorio");
        }
        if (aggregateType == null || aggregateType.isBlank()) {
            throw new IllegalStateException("aggregateType es obligatorio");
        }
        if (aggregateId == null || aggregateId.isBlank()) {
            throw new IllegalStateException("aggregateId es obligatorio");
        }
        if (source == null || source.isBlank()) {
            throw new IllegalStateException("source es obligatorio");
        }
        return EventEnvelope.builder()
                .eventId(UUID.randomUUID())
                .eventType(eventType)
                .eventVersion(eventVersion == null ? DEFAULT_EVENT_VERSION : eventVersion)
                .occurredAt(Instant.now())
                .source(source)
                .aggregateType(aggregateType)
                .aggregateId(aggregateId)
                .correlationId(correlationId)
                // Payload obligatorio que NUNCA sea null (envelope canónico).
                .payload(payload == null ? new java.util.HashMap<String, Object>() : payload)
                .build();
    }
}
