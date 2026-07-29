package com.alquilaya.serviciousuarios.listeners;

import com.alquilaya.serviciousuarios.dto.PropiedadAprobadaEventDTO;
import com.alquilaya.serviciousuarios.kafka.idempotency.service.IdempotencyService;
import com.alquilaya.serviciousuarios.outbox.envelope.EventEnvelope;
import com.alquilaya.serviciousuarios.services.SuscripcionAlertaService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Consume {@code propiedades-topic} para disparar las alertas por correo de nuevas propiedades
 * (#99/#492). Filtra por {@code eventType == "PROPIEDAD_APROBADA"} e ignora el resto de eventos
 * del topic (p.ej. {@code PROPIEDAD_ACTUALIZADA}).
 *
 * <p><b>Idempotencia:</b> Kafka puede reentregar. Se usa el {@link IdempotencyService} existente
 * (marca por {@code (eventId, consumerName)}) exactamente igual que {@code ResenaEventListener}:
 * un evento reentregado se descarta antes de reenviar correos. El envío de cada correo es
 * best-effort y no revierte la marca (mejor no reenviar a todos que spamear en un retry).</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PropiedadEventListener {

    private static final String CONSUMER_NAME = "usuarios-propiedades-topic";
    private static final String EVENT_APROBADA = "PROPIEDAD_APROBADA";

    private final ObjectMapper objectMapper;
    private final IdempotencyService idempotencyService;
    private final SuscripcionAlertaService suscripcionAlertaService;

    @KafkaListener(topics = "propiedades-topic", groupId = "servicio-usuarios-alertas")
    @Transactional
    public void onPropiedadEvent(String raw) {
        try {
            EventEnvelope ev = EventEnvelope.parseOrLegacy(raw);
            if (ev == null) {
                // Eventos legacy sin envelope (ej. "PROPIEDAD_ACTUALIZADA" ad-hoc de creación): no aplican.
                return;
            }
            if (!EVENT_APROBADA.equals(ev.getEventType())) {
                log.debug("eventType {} ignorado por {}", ev.getEventType(), CONSUMER_NAME);
                return;
            }
            if (!idempotencyService.marcarComoProcesado(ev.getEventId(), CONSUMER_NAME)) {
                log.debug("Evento {} ya procesado por {}, ignorado.", ev.getEventId(), CONSUMER_NAME);
                return;
            }
            JsonNode payload = objectMapper.valueToTree(ev.getPayload());
            PropiedadAprobadaEventDTO dto = new PropiedadAprobadaEventDTO(
                    asLong(payload, "propiedadId"),
                    asText(payload, "titulo"),
                    asDecimal(payload, "precio"),
                    asLong(payload, "zonaId"),
                    asLong(payload, "universidadId"),
                    asText(payload, "tipoPropiedad"),
                    asText(payload, "ubicacion"),
                    asStringList(payload, "servicios"),
                    asInteger(payload, "dormitorios"),
                    asInteger(payload, "capacidad"));
            suscripcionAlertaService.notificarPropiedadAprobada(dto);
        } catch (Exception e) {
            log.error("Error procesando evento propiedades-topic: {}", e.getMessage(), e);
            // Re-lanza para que la @Transactional revierta la marca de idempotencia y Kafka reintente.
            throw new RuntimeException(e);
        }
    }

    private static Long asLong(JsonNode node, String field) {
        return node != null && node.hasNonNull(field) ? node.get(field).asLong() : null;
    }

    private static String asText(JsonNode node, String field) {
        return node != null && node.hasNonNull(field) ? node.get(field).asText() : null;
    }

    private static BigDecimal asDecimal(JsonNode node, String field) {
        return node != null && node.hasNonNull(field) ? new BigDecimal(node.get(field).asText()) : null;
    }

    private static Integer asInteger(JsonNode node, String field) {
        return node != null && node.hasNonNull(field) ? node.get(field).asInt() : null;
    }

    /**
     * Lee un array de strings del payload. Devuelve {@code null} si el campo no viene (el productor
     * aún no lo emite) para que el matching lo trate como "no verificable"; devuelve lista vacía si
     * viene un array vacío (la propiedad no tiene servicios). Ignora nodos no textuales del array.
     */
    private static java.util.List<String> asStringList(JsonNode node, String field) {
        if (node == null || !node.hasNonNull(field)) return null;
        JsonNode arr = node.get(field);
        if (!arr.isArray()) return null;
        java.util.List<String> out = new java.util.ArrayList<>(arr.size());
        for (JsonNode el : arr) {
            if (el != null && !el.isNull()) out.add(el.asText());
        }
        return out;
    }
}
