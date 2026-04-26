package com.plasencia.servicio_mensajeria.kafka;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plasencia.servicio_mensajeria.clients.UsuariosClient;
import com.plasencia.servicio_mensajeria.dto.UsuarioPerfilDTO;
import com.plasencia.servicio_mensajeria.enums.TipoNotificacion;
import com.plasencia.servicio_mensajeria.services.NotificacionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Escucha el topic `reserva-events` (productor: servicio-propiedades) y crea
 * notificaciones in-app para el estudiante o arrendador según el tipo.
 *
 * Formato del evento (JSON): { tipo, reservaId, propiedadId, estudianteId,
 *   arrendadorId, estado, montoTotal, motivo?, estudianteNombre?, ... }
 *
 * NOTA: `estudianteId` y `arrendadorId` son perfilIds. Para enviar la notif
 * necesitamos el `userId` (clave del Principal STOMP). Resolvemos vía Feign
 * a servicio-usuarios.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReservaEventConsumer {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final NotificacionService notificacionService;
    private final UsuariosClient usuariosClient;

    @KafkaListener(topics = "reserva-events", groupId = "mensajeria-notif-group")
    public void escuchar(String mensaje) {
        log.info("📥 [NOTIF] reserva-events recibido");
        try {
            Map<String, Object> payload = objectMapper.readValue(mensaje, new TypeReference<>() {});
            String tipo = (String) payload.get("tipo");
            Long reservaId = toLong(payload.get("reservaId"));
            Long estudiantePerfilId = toLong(payload.get("estudianteId"));
            Long arrendadorPerfilId = toLong(payload.get("arrendadorId"));

            switch (tipo == null ? "" : tipo.toUpperCase()) {
                case "CREADA" -> notificarArrendador(arrendadorPerfilId, reservaId,
                        TipoNotificacion.MENSAJE_NUEVO,
                        "Nueva solicitud de reserva",
                        "Un estudiante quiere reservar tu cuarto. Revisa los detalles.",
                        "/landlord/reservations/pending", payload);
                case "APROBADA" -> notificarEstudiante(estudiantePerfilId, reservaId,
                        TipoNotificacion.RESERVA_APROBADA,
                        "Tu reserva fue aprobada",
                        "El arrendador aprobó tu solicitud. Continúa con el pago.",
                        "/student/reservations", payload);
                case "RECHAZADA" -> notificarEstudiante(estudiantePerfilId, reservaId,
                        TipoNotificacion.RESERVA_RECHAZADA,
                        "Tu reserva fue rechazada",
                        opt(payload.get("motivo"), "El arrendador no aceptó esta solicitud."),
                        "/student/reservations", payload);
                case "CANCELADA" -> {
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
                default -> log.debug("[NOTIF] tipo desconocido: {}", tipo);
            }
        } catch (Exception e) {
            log.error("Fallo procesando reserva-events: {}", e.getMessage(), e);
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
