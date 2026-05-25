package com.alquilaya.serviciousuarios.outbox.envelope;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests para {@link EventEnvelope#parseOrLegacy(String)}.
 *
 * Cubre la matriz documentada en docs/consistencia/00-event-envelope.md §5:
 *   - JSON envelope válido        → devuelve EventEnvelope poblado
 *   - String legacy (no JSON)     → devuelve null
 *   - JSON inválido / vacío       → devuelve null
 *   - JSON sin campos clave       → devuelve null
 */
class EventEnvelopeTest {

    @Test
    void parseOrLegacy_jsonEnvelopeValido_devuelveEnvelopePoblado() {
        UUID eventId = UUID.fromString("1d3f8a44-3a1e-4f33-9c0b-2a4b2b6b7c01");
        String raw = """
                {
                  "eventId":      "%s",
                  "eventType":    "USER_APROBADO",
                  "eventVersion": 1,
                  "occurredAt":   "2026-05-25T10:30:00Z",
                  "source":       "servicio-usuarios",
                  "aggregateType":"Usuario",
                  "aggregateId":  "17",
                  "correlationId":"9a2c8c54-cf2b-4e22-9b8a-aae7c8f08c10",
                  "payload":      {"usuarioId": 17, "rol": "ESTUDIANTE"}
                }
                """.formatted(eventId);

        EventEnvelope env = EventEnvelope.parseOrLegacy(raw);

        assertThat(env).isNotNull();
        assertThat(env.getEventId()).isEqualTo(eventId);
        assertThat(env.getEventType()).isEqualTo("USER_APROBADO");
        assertThat(env.getEventVersion()).isEqualTo(1);
        assertThat(env.getOccurredAt()).isEqualTo(Instant.parse("2026-05-25T10:30:00Z"));
        assertThat(env.getSource()).isEqualTo("servicio-usuarios");
        assertThat(env.getAggregateType()).isEqualTo("Usuario");
        assertThat(env.getAggregateId()).isEqualTo("17");
        assertThat(env.getCorrelationId()).isEqualTo("9a2c8c54-cf2b-4e22-9b8a-aae7c8f08c10");
        assertThat(env.getPayload()).isNotNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "PAGO_EXITOSO:123",
            "PAGO_RECHAZADO:456",
            "RESERVA_APROBADA:7",
            "texto-suelto"
    })
    void parseOrLegacy_stringLegacyPlano_devuelveNull(String legacy) {
        assertThat(EventEnvelope.parseOrLegacy(legacy)).isNull();
    }

    @Test
    void parseOrLegacy_jsonInvalido_devuelveNull() {
        assertThat(EventEnvelope.parseOrLegacy("{ esto no es json valido")).isNull();
    }

    @Test
    void parseOrLegacy_jsonVacioOEspacios_devuelveNull() {
        assertThat(EventEnvelope.parseOrLegacy(null)).isNull();
        assertThat(EventEnvelope.parseOrLegacy("")).isNull();
        assertThat(EventEnvelope.parseOrLegacy("   ")).isNull();
    }

    @Test
    void parseOrLegacy_jsonSinEventId_devuelveNull() {
        String raw = """
                {
                  "eventType": "USER_APROBADO",
                  "payload":   {"usuarioId": 17}
                }
                """;
        assertThat(EventEnvelope.parseOrLegacy(raw)).isNull();
    }

    @Test
    void parseOrLegacy_jsonSinEventType_devuelveNull() {
        String raw = """
                {
                  "eventId":  "1d3f8a44-3a1e-4f33-9c0b-2a4b2b6b7c01",
                  "payload":  {"usuarioId": 17}
                }
                """;
        assertThat(EventEnvelope.parseOrLegacy(raw)).isNull();
    }

    @Test
    void parseOrLegacy_jsonLegacyConCampoTipo_devuelveNull() {
        // Caso documentado: {"tipo":"APROBACION", ...} debe caer a la ruta legacy.
        String raw = """
                {
                  "tipo":       "APROBACION",
                  "usuarioId":  7,
                  "correo":     "x@x"
                }
                """;
        assertThat(EventEnvelope.parseOrLegacy(raw)).isNull();
    }

    @Test
    void parseOrLegacy_jsonConWhitespaceInicial_funciona() {
        // El método usa stripLeading() — debe tolerar espacios al inicio.
        String raw = "   \n  " + """
                {
                  "eventId":   "1d3f8a44-3a1e-4f33-9c0b-2a4b2b6b7c01",
                  "eventType": "USER_APROBADO",
                  "payload":   {}
                }
                """;
        EventEnvelope env = EventEnvelope.parseOrLegacy(raw);
        assertThat(env).isNotNull();
        assertThat(env.getEventType()).isEqualTo("USER_APROBADO");
    }
}
