package com.alquilaya.serviciousuarios.outbox.envelope;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Envelope estándar de eventos Kafka (Ola 2).
 *
 * <p>Estructura canónica documentada en {@code docs/consistencia/00-event-envelope.md}.
 * Todos los productores envuelven el payload de negocio con esta clase antes de
 * publicarlo. Los consumers usan {@link #parseOrLegacy(String)} para detectar
 * automáticamente formato nuevo vs formato legacy.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.ALWAYS)
public class EventEnvelope {

    /** Mapper interno (estático) usado SOLO para {@link #parseOrLegacy(String)}. */
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private UUID eventId;
    private String eventType;
    private Integer eventVersion;
    private Instant occurredAt;
    private String source;
    private String aggregateType;
    private String aggregateId;
    private String correlationId;
    private Object payload;

    /**
     * Detecta si {@code raw} es un envelope JSON estándar.
     *
     * @return el envelope deserializado si el JSON contiene {@code eventId} y
     *         {@code eventType}; {@code null} si es legacy (string plano o JSON
     *         con esquema antiguo). El consumer cae a su parser viejo en ese caso.
     */
    public static EventEnvelope parseOrLegacy(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String trimmed = raw.stripLeading();
        if (!trimmed.startsWith("{")) {
            // Legacy string plano (ej. "PAGO_EXITOSO:123").
            return null;
        }
        try {
            JsonNode node = MAPPER.readTree(raw);
            if (node.hasNonNull("eventId") && node.hasNonNull("eventType")) {
                return MAPPER.treeToValue(node, EventEnvelope.class);
            }
            // JSON legacy (ej. {"tipo":"APROBACION", ...}).
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}
