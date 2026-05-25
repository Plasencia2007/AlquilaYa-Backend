package com.alquilaya.serviciopagos.outbox.envelope;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Envelope canónico de eventos Kafka — ver docs/consistencia/00-event-envelope.md.
 * Todos los campos son obligatorios salvo {@code correlationId}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.ALWAYS)
public class EventEnvelope {

    private UUID eventId;
    private String eventType;
    private int eventVersion;
    private Instant occurredAt;
    private String source;
    private String aggregateType;
    private String aggregateId;
    private String correlationId;
    private Object payload;
}
