package com.alquilaya.serviciopropiedades.outbox.envelope;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * POJO canónico del envelope de eventos Kafka — ver docs/consistencia/00-event-envelope.md.
 *
 * Esta misma clase se duplica intencionalmente en cada servicio durante Ola 2.
 * En Ola 5 se extraerá a `alquilaya-common-events`.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class EventEnvelope {

    private UUID eventId;
    private String eventType;
    private Integer eventVersion;
    private Instant occurredAt;
    private String source;
    private String aggregateType;
    private String aggregateId;
    private String correlationId;
    private JsonNode payload;

    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .addModule(new JavaTimeModule())
            .build();

    /**
     * Parser dual: si el JSON tiene `eventId` + `eventType` se considera envelope nuevo,
     * en cualquier otro caso devuelve null y el consumer aplicará su parser legacy.
     *
     * @param raw payload tal como llegó del topic
     * @return envelope deserializado, o null si es formato legacy / no parseable
     */
    public static EventEnvelope parseOrLegacy(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String trimmed = raw.stripLeading();
        if (!trimmed.startsWith("{")) {
            return null;
        }
        try {
            JsonNode node = MAPPER.readTree(raw);
            if (node.hasNonNull("eventId") && node.hasNonNull("eventType")) {
                return MAPPER.treeToValue(node, EventEnvelope.class);
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}
