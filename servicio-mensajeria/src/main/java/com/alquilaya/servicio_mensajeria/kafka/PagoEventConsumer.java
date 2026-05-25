package com.alquilaya.servicio_mensajeria.kafka;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.alquilaya.servicio_mensajeria.enums.TipoNotificacion;
import com.alquilaya.servicio_mensajeria.kafka.envelope.EventEnvelope;
import com.alquilaya.servicio_mensajeria.kafka.idempotency.service.IdempotencyService;
import com.alquilaya.servicio_mensajeria.services.NotificacionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * Escucha el topic `pagos-topic` y notifica al estudiante cuando un pago se
 * confirma, se rechaza o queda en revisión.
 *
 * Soporta dos formatos durante la transición (Olas 2-3):
 *  - Envelope nuevo: {@code eventType = "PAGO_EXITOSO" | "PAGO_FALLIDO" | "PAGO_EN_REVISION" | "PAGO_PENDIENTE"}
 *    con {@code payload.estudianteUserId} enriquecido por servicio-pagos.
 *  - Legacy: string plano {@code "PAGO_EXITOSO:<reservaId>"} / {@code "PAGO_RECHAZADO:<reservaId>"}.
 *    En legacy no llega el userId — se confía en que el evento RESERVA_PAGADA
 *    llegará por reserva-events con datos completos.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PagoEventConsumer {

    private static final String CONSUMER_NAME = "mensajeria-pagos-topic";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final NotificacionService notificacionService;
    private final IdempotencyService idempotencyService;

    @KafkaListener(topics = "pagos-topic", groupId = "mensajeria-notif-group")
    @Transactional
    public void escuchar(String mensaje) {
        log.info("📥 [NOTIF] pagos-topic: {}", mensaje);
        if (mensaje == null || mensaje.isBlank()) return;

        try {
            EventEnvelope ev = EventEnvelope.parseOrLegacy(mensaje);
            if (ev != null) {
                if (!idempotencyService.marcarComoProcesado(ev.getEventId(), CONSUMER_NAME)) {
                    log.debug("[NOTIF] pagos-topic eventId={} ya procesado", ev.getEventId());
                    return;
                }
                manejarEnvelope(ev);
            } else {
                manejarLegacy(mensaje);
            }
        } catch (Exception e) {
            log.error("Fallo procesando pagos-topic: {}", e.getMessage(), e);
            throw new RuntimeException(e); // rollback → reintento por Kafka
        }
    }

    /**
     * Ruta nueva: extrae {@code payload.estudianteUserId} y persiste la notificación.
     */
    private void manejarEnvelope(EventEnvelope ev) {
        Map<String, Object> payload = ev.getPayload() != null ? ev.getPayload() : new HashMap<>();
        String eventType = ev.getEventType() == null ? "" : ev.getEventType().toUpperCase();

        Long estudianteUserId = toLong(payload.get("estudianteUserId"));
        if (estudianteUserId == null) {
            log.debug("[NOTIF] pagos-topic envelope sin estudianteUserId: {}", payload);
            return;
        }
        Long reservaId = toLong(payload.get("reservaId"));

        Map<String, Object> datos = new HashMap<>();
        if (reservaId != null) datos.put("reservaId", reservaId);
        if (payload.get("monto") != null) datos.put("monto", payload.get("monto"));
        if (payload.get("pagoId") != null) datos.put("pagoId", payload.get("pagoId"));

        switch (eventType) {
            case "PAGO_EXITOSO" -> notificacionService.crear(estudianteUserId,
                    TipoNotificacion.RESERVA_PAGADA,
                    "Pago confirmado",
                    "Recibimos tu pago. Tu reserva está confirmada.",
                    "/student/reservations", datos, true);
            case "PAGO_FALLIDO" -> {
                if (payload.get("motivo") != null) datos.put("motivo", payload.get("motivo"));
                notificacionService.crear(estudianteUserId,
                        TipoNotificacion.SISTEMA,
                        "Pago rechazado",
                        "Tu pago no pudo procesarse. Intenta nuevamente.",
                        "/student/reservations", datos, true);
            }
            case "PAGO_EN_REVISION" -> notificacionService.crear(estudianteUserId,
                    TipoNotificacion.SISTEMA,
                    "Pago en revisión",
                    "Tu pago está en revisión. Te avisaremos cuando se confirme.",
                    "/student/reservations", datos, true);
            case "PAGO_PENDIENTE" -> notificacionService.crear(estudianteUserId,
                    TipoNotificacion.RECORDATORIO_PAGO,
                    "Tu pago está listo",
                    "Continúa con el pago de tu reserva para confirmarla.",
                    "/student/reservations", datos, true);
            default -> log.debug("[NOTIF] pagos-topic eventType desconocido: {}", eventType);
        }
    }

    /**
     * Ruta legacy: soporta string plano y JSON ad-hoc. Se elimina en Ola 4.
     */
    private void manejarLegacy(String mensaje) throws Exception {
        if (mensaje.startsWith("PAGO_EXITOSO:") || mensaje.startsWith("PAGO_RECHAZADO:")) {
            // String plano legacy. No hay userId — se confía en que el evento
            // RESERVA_PAGADA llegará por reserva-events con datos completos.
            log.debug("[NOTIF] pagos-topic formato string legacy, ignorado: {}", mensaje);
            return;
        }
        // JSON legacy: { reservaId, estudianteUserId?, ... }
        Map<String, Object> payload = objectMapper.readValue(mensaje, new TypeReference<>() {});
        Long estudianteUserId = toLong(payload.get("estudianteUserId"));
        if (estudianteUserId == null) {
            log.debug("[NOTIF] pagos-topic JSON legacy sin estudianteUserId: {}", payload);
            return;
        }
        Long reservaId = toLong(payload.get("reservaId"));

        Map<String, Object> datos = new HashMap<>();
        if (reservaId != null) datos.put("reservaId", reservaId);
        if (payload.get("monto") != null) datos.put("monto", payload.get("monto"));

        notificacionService.crear(estudianteUserId, TipoNotificacion.RESERVA_PAGADA,
                "Pago confirmado",
                "Recibimos tu pago. Tu reserva está confirmada.",
                "/student/reservations", datos, true);
    }

    private static Long toLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try { return Long.parseLong(v.toString()); } catch (NumberFormatException e) { return null; }
    }
}
