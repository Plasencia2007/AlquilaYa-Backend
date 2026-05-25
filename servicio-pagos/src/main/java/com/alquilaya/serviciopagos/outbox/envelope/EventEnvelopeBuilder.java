package com.alquilaya.serviciopagos.outbox.envelope;

import java.time.Instant;
import java.util.UUID;

/**
 * Builder canónico para construir {@link EventEnvelope}.
 * <ul>
 *   <li>{@code eventId} se genera con {@link UUID#randomUUID()}.</li>
 *   <li>{@code occurredAt} se genera con {@link Instant#now()}.</li>
 *   <li>{@code eventVersion} arranca en 1 (catálogo §04).</li>
 *   <li>Si {@code payload} es {@code null}, lanza {@link IllegalStateException}: el envelope nunca puede llevar payload null.</li>
 * </ul>
 */
public final class EventEnvelopeBuilder {

    private String eventType;
    private int eventVersion = 1;
    private String source;
    private String aggregateType;
    private String aggregateId;
    private String correlationId;
    private Object payload;

    private EventEnvelopeBuilder() {
    }

    public static EventEnvelopeBuilder builder() {
        return new EventEnvelopeBuilder();
    }

    public EventEnvelopeBuilder eventType(String eventType) {
        this.eventType = eventType;
        return this;
    }

    public EventEnvelopeBuilder eventVersion(int eventVersion) {
        this.eventVersion = eventVersion;
        return this;
    }

    public EventEnvelopeBuilder source(String source) {
        this.source = source;
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

    public EventEnvelopeBuilder correlationId(String correlationId) {
        this.correlationId = correlationId;
        return this;
    }

    public EventEnvelopeBuilder payload(Object payload) {
        this.payload = payload;
        return this;
    }

    public EventEnvelope build() {
        if (eventType == null || eventType.isBlank()) {
            throw new IllegalStateException("eventType es obligatorio");
        }
        if (source == null || source.isBlank()) {
            throw new IllegalStateException("source es obligatorio");
        }
        if (aggregateType == null || aggregateType.isBlank()) {
            throw new IllegalStateException("aggregateType es obligatorio");
        }
        if (aggregateId == null || aggregateId.isBlank()) {
            throw new IllegalStateException("aggregateId es obligatorio");
        }
        if (payload == null) {
            throw new IllegalStateException("payload no puede ser null (usar {} si vacío)");
        }
        return EventEnvelope.builder()
                .eventId(UUID.randomUUID())
                .eventType(eventType)
                .eventVersion(eventVersion)
                .occurredAt(Instant.now())
                .source(source)
                .aggregateType(aggregateType)
                .aggregateId(aggregateId)
                .correlationId(correlationId)
                .payload(payload)
                .build();
    }
}
