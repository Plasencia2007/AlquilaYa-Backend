package com.alquilaya.servicio_mensajeria.kafka;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.alquilaya.servicio_mensajeria.clients.UsuariosClient;
import com.alquilaya.servicio_mensajeria.dto.UsuarioPerfilDTO;
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
 * Escucha el topic `reserva-events` (productor: servicio-propiedades) y crea
 * notificaciones in-app para el estudiante o arrendador según el tipo.
 *
 * Soporta dos formatos durante la transición (Olas 2-3):
 *  - Envelope nuevo: {@code eventType = "RESERVA_SOLICITADA" | "RESERVA_APROBADA" | ...}
 *  - Legacy: JSON con campo {@code tipo} (mantenido como red de seguridad).
 *
 * BUG FIX Ola 2: el switch anterior matcheaba contra {@code "CREADA" | "APROBADA" | "RECHAZADA" | "CANCELADA"}
 * pero el productor emite {@code "RESERVA_SOLICITADA" | "RESERVA_APROBADA" | ...}.
 * En la ruta nueva el switch consume {@code eventType} del envelope.
 * En la ruta legacy se mantienen AMBOS valores (los antiguos y los del productor real)
 * por si quedan mensajes en cola.
 *
 * NOTA: `estudianteId` y `arrendadorId` son perfilIds. Para enviar la notif
 * necesitamos el `userId` (clave del Principal STOMP). Resolvemos vía Feign
 * a servicio-usuarios.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReservaEventConsumer {

    private static final String CONSUMER_NAME = "mensajeria-reserva-events";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final NotificacionService notificacionService;
    private final UsuariosClient usuariosClient;
    private final IdempotencyService idempotencyService;

    @KafkaListener(topics = "reserva-events", groupId = "mensajeria-notif-group")
    @Transactional
    public void escuchar(String mensaje) {
        log.info("📥 [NOTIF] reserva-events recibido");
        try {
            EventEnvelope ev = EventEnvelope.parseOrLegacy(mensaje);
            if (ev != null) {
                if (!idempotencyService.marcarComoProcesado(ev.getEventId(), CONSUMER_NAME)) {
                    log.debug("[NOTIF] reserva-events eventId={} ya procesado", ev.getEventId());
                    return;
                }
                manejarEnvelope(ev);
            } else {
                manejarLegacy(mensaje);
            }
        } catch (Exception e) {
            log.error("Fallo procesando reserva-events: {}", e.getMessage(), e);
            throw new RuntimeException(e); // rollback para que Kafka reintente
        }
    }

    /**
     * Ruta nueva: usa {@code eventType} del envelope (catálogo §04).
     */
    private void manejarEnvelope(EventEnvelope ev) {
        Map<String, Object> payload = ev.getPayload() != null ? ev.getPayload() : new HashMap<>();
        String eventType = ev.getEventType() == null ? "" : ev.getEventType().toUpperCase();

        Long reservaId = toLong(payload.get("reservaId"));
        Long estudiantePerfilId = toLong(payload.get("estudianteId"));
        Long arrendadorPerfilId = toLong(payload.get("arrendadorId"));

        switch (eventType) {
            case "RESERVA_SOLICITADA" -> notificarArrendador(arrendadorPerfilId, reservaId,
                    TipoNotificacion.MENSAJE_NUEVO,
                    "Nueva solicitud de reserva",
                    "Un estudiante quiere reservar tu cuarto. Revisa los detalles.",
                    "/landlord/reservations/pending", payload);
            case "RESERVA_APROBADA" -> notificarEstudiante(estudiantePerfilId, reservaId,
                    TipoNotificacion.RESERVA_APROBADA,
                    "Tu reserva fue aprobada",
                    "El arrendador aprobó tu solicitud. Continúa con el pago.",
                    "/student/reservations", payload);
            case "RESERVA_RECHAZADA" -> notificarEstudiante(estudiantePerfilId, reservaId,
                    TipoNotificacion.RESERVA_RECHAZADA,
                    "Tu reserva fue rechazada",
                    opt(payload.get("motivo"), "El arrendador no aceptó esta solicitud."),
                    "/student/reservations", payload);
            case "RESERVA_PAGADA" -> notificarEstudiante(estudiantePerfilId, reservaId,
                    TipoNotificacion.RESERVA_PAGADA,
                    "Tu reserva está confirmada",
                    "Recibimos tu pago. Tu reserva está confirmada.",
                    "/student/reservations", payload);
            case "RESERVA_CANCELADA" -> {
                notificarEstudiante(estudiantePerfilId, reservaId,
                        TipoNotificacion.RESERVA_CANCELADA,
                        "Reserva cancelada",
                        "Tu reserva ha sido cancelada.",
                        "/student/reservations", payload);
                notificarArrendador(arrendadorPerfilId, reservaId,
                        TipoNotificacion.RESERVA_CANCELADA,
                        "Reserva cancelada",
                        "Una reserva fue cancelada.",
                        "/landlord/reservations/history", payload);
            }
            case "RESERVA_FINALIZADA" -> notificarEstudiante(estudiantePerfilId, reservaId,
                    TipoNotificacion.SISTEMA,
                    "Tu estadía terminó",
                    "¿Cómo fue tu experiencia? Deja una reseña al arrendador.",
                    "/student/reservations", payload);
            default -> log.debug("[NOTIF] reserva-events eventType desconocido: {}", eventType);
        }
    }

    /**
     * Ruta legacy: matchea contra el campo {@code tipo} del JSON ad-hoc.
     *
     * Acepta tanto los strings antiguos {@code "CREADA"|"APROBADA"|"RECHAZADA"|"CANCELADA"}
     * (que nunca matcheaban con el productor real — bug original) como los strings
     * canónicos {@code "RESERVA_SOLICITADA"|"RESERVA_APROBADA"|...} (que SÍ usa el productor
     * antes de migrar al envelope). Esto cubre cualquier mensaje en vuelo.
     *
     * Esta rama se elimina en Ola 4.
     */
    private void manejarLegacy(String mensaje) throws Exception {
        Map<String, Object> payload = objectMapper.readValue(mensaje, new TypeReference<>() {});
        String tipo = (String) payload.get("tipo");
        Long reservaId = toLong(payload.get("reservaId"));
        Long estudiantePerfilId = toLong(payload.get("estudianteId"));
        Long arrendadorPerfilId = toLong(payload.get("arrendadorId"));

        switch (tipo == null ? "" : tipo.toUpperCase()) {
            case "CREADA", "RESERVA_SOLICITADA" -> notificarArrendador(arrendadorPerfilId, reservaId,
                    TipoNotificacion.MENSAJE_NUEVO,
                    "Nueva solicitud de reserva",
                    "Un estudiante quiere reservar tu cuarto. Revisa los detalles.",
                    "/landlord/reservations/pending", payload);
            case "APROBADA", "RESERVA_APROBADA" -> notificarEstudiante(estudiantePerfilId, reservaId,
                    TipoNotificacion.RESERVA_APROBADA,
                    "Tu reserva fue aprobada",
                    "El arrendador aprobó tu solicitud. Continúa con el pago.",
                    "/student/reservations", payload);
            case "RECHAZADA", "RESERVA_RECHAZADA" -> notificarEstudiante(estudiantePerfilId, reservaId,
                    TipoNotificacion.RESERVA_RECHAZADA,
                    "Tu reserva fue rechazada",
                    opt(payload.get("motivo"), "El arrendador no aceptó esta solicitud."),
                    "/student/reservations", payload);
            case "PAGADA", "RESERVA_PAGADA" -> notificarEstudiante(estudiantePerfilId, reservaId,
                    TipoNotificacion.RESERVA_PAGADA,
                    "Tu reserva está confirmada",
                    "Recibimos tu pago. Tu reserva está confirmada.",
                    "/student/reservations", payload);
            case "CANCELADA", "RESERVA_CANCELADA" -> {
                notificarEstudiante(estudiantePerfilId, reservaId,
                        TipoNotificacion.RESERVA_CANCELADA,
                        "Reserva cancelada",
                        "Tu reserva ha sido cancelada.",
                        "/student/reservations", payload);
                notificarArrendador(arrendadorPerfilId, reservaId,
                        TipoNotificacion.RESERVA_CANCELADA,
                        "Reserva cancelada",
                        "Una reserva fue cancelada.",
                        "/landlord/reservations/history", payload);
            }
            default -> log.debug("[NOTIF] reserva-events legacy tipo desconocido: {}", tipo);
        }
    }

    private void notificarEstudiante(Long perfilId, Long reservaId, TipoNotificacion tipo,
                                     String titulo, String mensaje, String url, Map<String, Object> payload) {
        if (perfilId == null) return;
        Long userId = resolverUserIdEstudiante(perfilId);
        if (userId == null) return;
        notificacionService.crear(userId, tipo, titulo, mensaje, url,
                datosBase(reservaId, payload), true);
    }

    private void notificarArrendador(Long perfilId, Long reservaId, TipoNotificacion tipo,
                                     String titulo, String mensaje, String url, Map<String, Object> payload) {
        if (perfilId == null) return;
        Long userId = resolverUserIdArrendador(perfilId);
        if (userId == null) return;
        notificacionService.crear(userId, tipo, titulo, mensaje, url,
                datosBase(reservaId, payload), true);
    }

    private Long resolverUserIdEstudiante(Long perfilId) {
        try {
            UsuarioPerfilDTO dto = usuariosClient.obtenerEstudiante(perfilId);
            return dto != null ? dto.getUsuarioId() : null;
        } catch (Exception e) {
            log.warn("No se pudo resolver userId estudiante perfilId={}: {}", perfilId, e.getMessage());
            return null;
        }
    }

    private Long resolverUserIdArrendador(Long perfilId) {
        try {
            UsuarioPerfilDTO dto = usuariosClient.obtenerArrendador(perfilId);
            return dto != null ? dto.getUsuarioId() : null;
        } catch (Exception e) {
            log.warn("No se pudo resolver userId arrendador perfilId={}: {}", perfilId, e.getMessage());
            return null;
        }
    }

    private Map<String, Object> datosBase(Long reservaId, Map<String, Object> payload) {
        Map<String, Object> datos = new HashMap<>();
        datos.put("reservaId", reservaId);
        if (payload.get("propiedadId") != null) datos.put("propiedadId", payload.get("propiedadId"));
        if (payload.get("estado") != null) datos.put("estado", payload.get("estado"));
        if (payload.get("montoTotal") != null) datos.put("montoTotal", payload.get("montoTotal"));
        return datos;
    }

    private static Long toLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try { return Long.parseLong(v.toString()); } catch (NumberFormatException e) { return null; }
    }

    private static String opt(Object v, String fallback) {
        return v == null ? fallback : v.toString();
    }
}
