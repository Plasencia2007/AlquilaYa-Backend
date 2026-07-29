package com.alquilaya.serviciousuarios.listeners;

import com.alquilaya.serviciousuarios.kafka.idempotency.service.IdempotencyService;
import com.alquilaya.serviciousuarios.outbox.envelope.EventEnvelope;
import com.alquilaya.serviciousuarios.services.SecurityEventService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ítem 351: consume {@code user-security-events} (mismo servicio-usuarios que lo publica, vía
 * {@code UserEventProducer#emitirAlertaIntentosFallidos} → outbox → {@code OutboxScheduler}) y
 * persiste cada evento en {@code security_events} para que el panel admin de alertas pueda
 * leerlos sin depender de Kafka directamente.
 *
 * <p>El topic existía desde antes (productor ya lo emitía) pero nadie lo consumía — este listener
 * es nuevo, no reemplaza ninguno. Sigue exactamente el mismo patrón envelope + idempotencia que
 * {@code ResenaEventListener}/{@code PropiedadEventListener} de este mismo paquete.</p>
 *
 * <p>Sin ruta "legacy": este topic nació ya con el envelope estándar (Ola 2), nunca tuvo un
 * formato ad-hoc anterior — a diferencia de {@code user-approval-events}/{@code resenas-topic}.
 * Un mensaje sin envelope (o con {@code eventType} desconocido) simplemente se ignora.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SecurityEventListener {

    private static final String CONSUMER_NAME = "usuarios-security-events";
    private static final String EVENT_INTENTOS_FALLIDOS = "USER_INTENTOS_FALLIDOS";

    private final SecurityEventService securityEventService;
    private final ObjectMapper objectMapper;
    private final IdempotencyService idempotencyService;

    @KafkaListener(topics = "user-security-events", groupId = "servicio-usuarios-security-events")
    @Transactional
    public void escuchar(String raw) {
        try {
            EventEnvelope ev = EventEnvelope.parseOrLegacy(raw);
            if (ev == null) {
                log.debug("[Security] Mensaje sin envelope estándar en user-security-events, ignorado.");
                return;
            }
            if (!idempotencyService.marcarComoProcesado(ev.getEventId(), CONSUMER_NAME)) {
                log.debug("[Security] Evento {} ya procesado por {}, ignorado.", ev.getEventId(), CONSUMER_NAME);
                return;
            }
            String eventType = ev.getEventType() == null ? "" : ev.getEventType();
            if (!EVENT_INTENTOS_FALLIDOS.equals(eventType)) {
                log.debug("[Security] eventType {} ignorado por {}", eventType, CONSUMER_NAME);
                return;
            }

            Object payload = ev.getPayload();
            Long usuarioId = extraerUsuarioId(payload);
            String detalle = objectMapper.writeValueAsString(payload);

            securityEventService.registrar(eventType, usuarioId, detalle);
            log.info("[Security] {} persistido (usuarioId={})", eventType, usuarioId);
        } catch (Exception e) {
            log.error("Error procesando evento user-security-events: {}", e.getMessage(), e);
            // Re-lanza para que la @Transactional revierta la marca de idempotencia y Kafka reintente.
            throw new RuntimeException(e);
        }
    }

    @SuppressWarnings("unchecked")
    private Long extraerUsuarioId(Object payload) {
        if (!(payload instanceof java.util.Map)) return null;
        Object raw = ((java.util.Map<String, Object>) payload).get("usuarioId");
        if (raw instanceof Number n) return n.longValue();
        if (raw == null) return null;
        try {
            return Long.parseLong(raw.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
