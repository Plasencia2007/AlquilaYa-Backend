package com.alquilaya.serviciopropiedades.outbox.envelope;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.time.Instant;
import java.util.UUID;

/**
 * Builder de envelopes canónicos. Genera `eventId` (UUID v4) y `occurredAt` (now-UTC) automáticamente.
 * Ver docs/consistencia/00-event-envelope.md §4.
 */
public final class EventEnvelopeBuilder {

    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .addModule(new JavaTimeModule())
            .build();

    private UUID eventId;
    private String eventType;
    private Integer eventVersion = 1;
    private Instant occurredAt;
    private String source;
    private String aggregateType;
    private String aggregateId;
    private String correlationId;
    private Object payload;

    private EventEnvelopeBuilder() {}

    public static EventEnvelopeBuilder builder() {
        return new EventEnvelopeBuilder();
    }

    public EventEnvelopeBuilder eventId(UUID eventId) { this.eventId = eventId; return this; }
    public EventEnvelopeBuilder eventType(String eventType) { this.eventType = eventType; return this; }
    public EventEnvelopeBuilder eventVersion(Integer v) { this.eventVersion = v; return this; }
    public EventEnvelopeBuilder occurredAt(Instant t) { this.occurredAt = t; return this; }
    public EventEnvelopeBuilder source(String source) { this.source = source; return this; }
    public EventEnvelopeBuilder aggregateType(String aggregateType) { this.aggregateType = aggregateType; return this; }
    public EventEnvelopeBuilder aggregateId(String aggregateId) { this.aggregateId = aggregateId; return this; }
    public EventEnvelopeBuilder correlationId(String correlationId) { this.correlationId = correlationId; return this; }
    public EventEnvelopeBuilder payload(Object payload) { this.payload = payload; return this; }

    public EventEnvelope build() {
        EventEnvelope env = new EventEnvelope();
        env.setEventId(eventId != null ? eventId : UUID.randomUUID());
        env.setEventType(eventType);
        env.setEventVersion(eventVersion != null ? eventVersion : 1);
        env.setOccurredAt(occurredAt != null ? occurredAt : Instant.now());
        env.setSource(source);
        env.setAggregateType(aggregateType);
        env.setAggregateId(aggregateId);
        env.setCorrelationId(correlationId);

        JsonNode payloadNode;
        if (payload == null) {
            payloadNode = JsonNodeFactory.instance.objectNode();
        } else if (payload instanceof JsonNode jn) {
            payloadNode = jn;
        } else {
            payloadNode = MAPPER.valueToTree(payload);
        }
        env.setPayload(payloadNode);
        return env;
    }
}
