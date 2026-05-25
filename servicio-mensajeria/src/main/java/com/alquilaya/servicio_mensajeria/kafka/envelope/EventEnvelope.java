package com.alquilaya.servicio_mensajeria.kafka.envelope;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * POJO del envelope estándar de eventos Kafka.
 *
 * Ver docs/consistencia/00-event-envelope.md para el contrato completo.
 *
 * En servicio-mensajeria (consumer only) NO se incluye builder — sólo se
 * deserializa. El builder vive en los productores.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
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
    private Map<String, Object> payload;

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .findAndRegisterModules();

    /**
     * Detecta si el mensaje crudo es un envelope nuevo o un formato legacy.
     *
     * @return EventEnvelope poblado si el JSON tiene los campos clave del envelope
     *         (eventId + eventType); null si es legacy (string plano, o JSON antiguo
     *         con campo {@code tipo}). El consumer debe caer a su parser legacy
     *         cuando este método retorna null.
     */
    public static EventEnvelope parseOrLegacy(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String trimmed = raw.stripLeading();
        if (!trimmed.startsWith("{")) {
            // String legacy tipo "PAGO_EXITOSO:123"
            return null;
        }
        try {
            JsonNode node = MAPPER.readTree(raw);
            if (node.hasNonNull("eventId") && node.hasNonNull("eventType")) {
                return MAPPER.treeToValue(node, EventEnvelope.class);
            }
            // JSON legacy (sin envelope) — el consumer aplicará su parser viejo.
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}
