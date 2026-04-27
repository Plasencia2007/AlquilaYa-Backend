package com.alquilaya.servicio_mensajeria.kafka;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.alquilaya.servicio_mensajeria.enums.TipoNotificacion;
import com.alquilaya.servicio_mensajeria.services.NotificacionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Escucha `user-approval-events` (productor: servicio-usuarios) y notifica al
 * usuario cuando sus documentos son aprobados o rechazados por el admin.
 *
 * Formato (JSON): { tipo: "APROBACION" | "RECHAZO", usuarioId, correo, nombre,
 * telefono, motivo? }
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserApprovalEventConsumer {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final NotificacionService notificacionService;

    @KafkaListener(topics = "user-approval-events", groupId = "mensajeria-notif-group")
    public void escuchar(String mensaje) {
        log.info("📥 [NOTIF] user-approval-events recibido");
        try {
            Map<String, Object> payload = objectMapper.readValue(mensaje, new TypeReference<>() {});
            String tipo = (String) payload.get("tipo");
            Long usuarioId = toLong(payload.get("usuarioId"));
            String nombre = (String) payload.get("nombre");

            if (usuarioId == null) {
                log.warn("[NOTIF] user-approval sin usuarioId: {}", payload);
                return;
            }

            Map<String, Object> datos = new HashMap<>();
            datos.put("usuarioId", usuarioId);
            if (payload.get("motivo") != null) datos.put("motivo", payload.get("motivo"));

            switch (tipo == null ? "" : tipo.toUpperCase()) {
                case "APROBACION" -> {
                    notificacionService.crear(usuarioId, TipoNotificacion.DOCUMENTO_APROBADO,
                            "¡Identidad verificada!",
                            "Ya puedes reservar cuartos sin restricciones.",
                            "/student/profile", datos, true);
                    notificacionService.crear(usuarioId, TipoNotificacion.BIENVENIDA,
                            "Bienvenido a AlquilaYa, " + (nombre != null ? nombre : "estudiante"),
                            "Empieza explorando los cuartos cerca de la UPeU.",
                            "/", null, true);
                }
                case "RECHAZO" -> notificacionService.crear(usuarioId, TipoNotificacion.DOCUMENTO_RECHAZADO,
                        "Documentos rechazados",
                        opt(payload.get("motivo"), "Necesitamos que vuelvas a subir tus documentos."),
                        "/student/profile", datos, true);
                default -> log.debug("[NOTIF] user-approval tipo desconocido: {}", tipo);
            }
        } catch (Exception e) {
            log.error("Fallo procesando user-approval-events: {}", e.getMessage(), e);
        }
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
