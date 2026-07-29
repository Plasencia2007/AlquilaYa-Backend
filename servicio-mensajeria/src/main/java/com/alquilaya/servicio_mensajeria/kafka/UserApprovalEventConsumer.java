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
 * Escucha `user-approval-events` (productor: servicio-usuarios) y notifica al
 * usuario cuando sus documentos son aprobados o rechazados por el admin.
 *
 * Soporta dos formatos durante la transición (Olas 2-3):
 *  - Envelope nuevo: {@code eventType = "USER_APROBADO" | "USER_RECHAZADO" | "DOCUMENTO_SUBIDO"}.
 *  - Legacy: JSON con {@code tipo: "APROBACION" | "RECHAZO"}.
 *
 * Ítem 378 (PoC de notificaciones admin): {@code DOCUMENTO_SUBIDO} es el único evento de
 * este consumer que NO notifica al usuario dueño del recurso, sino a TODOS los admins
 * activos (no existe aún el concepto de "notificar por rol" en {@code NotificacionService},
 * así que se resuelve la lista de ids vía {@link AdminNotificador}, que a su vez llama a
 * {@code UsuariosClient#obtenerAdminsActivos()}).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserApprovalEventConsumer {

    private static final String CONSUMER_NAME = "mensajeria-user-approval-events";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final NotificacionService notificacionService;
    private final IdempotencyService idempotencyService;
    private final AdminNotificador adminNotificador;

    @KafkaListener(topics = "user-approval-events", groupId = "mensajeria-notif-group")
    @Transactional
    public void escuchar(String mensaje) {
        log.info("📥 [NOTIF] user-approval-events recibido");
        try {
            EventEnvelope ev = EventEnvelope.parseOrLegacy(mensaje);
            if (ev != null) {
                if (!idempotencyService.marcarComoProcesado(ev.getEventId(), CONSUMER_NAME)) {
                    log.debug("[NOTIF] user-approval-events eventId={} ya procesado", ev.getEventId());
                    return;
                }
                manejarEnvelope(ev);
            } else {
                manejarLegacy(mensaje);
            }
        } catch (Exception e) {
            log.error("Fallo procesando user-approval-events: {}", e.getMessage(), e);
            throw new RuntimeException(e); // rollback → reintento por Kafka
        }
    }

    /**
     * Ruta nueva: usa {@code eventType} del envelope (catálogo §04).
     *  - {@code USER_APROBADO}  → {@link TipoNotificacion#DOCUMENTO_APROBADO}
     *  - {@code USER_RECHAZADO} → {@link TipoNotificacion#DOCUMENTO_RECHAZADO}
     */
    private void manejarEnvelope(EventEnvelope ev) {
        Map<String, Object> payload = ev.getPayload() != null ? ev.getPayload() : new HashMap<>();
        String eventType = ev.getEventType() == null ? "" : ev.getEventType().toUpperCase();

        Long usuarioId = toLong(payload.get("usuarioId"));
        String nombre = (String) payload.get("nombre");

        if (usuarioId == null) {
            log.warn("[NOTIF] user-approval-events envelope sin usuarioId: {}", payload);
            return;
        }

        Map<String, Object> datos = new HashMap<>();
        datos.put("usuarioId", usuarioId);
        if (payload.get("motivo") != null) datos.put("motivo", payload.get("motivo"));

        // El texto/link se adapta al rol del usuario aprobado (U3): estudiante vs arrendador.
        boolean esArrendador = "ARRENDADOR".equalsIgnoreCase(String.valueOf(payload.get("rol")));
        String perfilUrl = esArrendador ? "/landlord/profile" : "/student/profile";

        switch (eventType) {
            case "USER_APROBADO" -> {
                notificacionService.crear(usuarioId, TipoNotificacion.DOCUMENTO_APROBADO,
                        "¡Identidad verificada!",
                        esArrendador
                                ? "Ya puedes publicar tus cuartos con la insignia de verificado."
                                : "Ya puedes reservar cuartos sin restricciones.",
                        esArrendador ? "/landlord/dashboard" : "/student/profile", datos, true);
                notificacionService.crear(usuarioId, TipoNotificacion.BIENVENIDA,
                        "Bienvenido a AlquilaYa, " + (nombre != null ? nombre : (esArrendador ? "arrendador" : "estudiante")),
                        esArrendador
                                ? "Empieza publicando tus cuartos cerca de la UPeU."
                                : "Empieza explorando los cuartos cerca de la UPeU.",
                        esArrendador ? "/landlord/dashboard" : "/", null, true);
            }
            case "USER_RECHAZADO" -> notificacionService.crear(usuarioId, TipoNotificacion.DOCUMENTO_RECHAZADO,
                    "Documentos rechazados",
                    opt(payload.get("motivo"), "Necesitamos que vuelvas a subir tus documentos."),
                    perfilUrl, datos, true);
            // Ítem 378 (PoC): a diferencia de los dos casos de arriba, este NO notifica al
            // usuario dueño del documento (sigue PENDIENTE, nada nuevo que decirle) sino a
            // todos los admins activos.
            case "DOCUMENTO_SUBIDO" -> notificarAdmins(payload);
            default -> log.debug("[NOTIF] user-approval-events eventType desconocido: {}", eventType);
        }
    }

    /**
     * Ítem 378: notifica a TODOS los admins activos (resueltos vía Feign) en vez de al
     * usuario dueño del documento — invocado desde el caso {@code DOCUMENTO_SUBIDO} de
     * {@link #manejarEnvelope}. La resolución de admins + fan-out vive en
     * {@link AdminNotificador}, compartido con {@code PropiedadEventConsumer}.
     */
    private void notificarAdmins(Map<String, Object> payload) {
        Long documentoId = toLong(payload.get("documentoId"));
        String nombre = (String) payload.get("nombre");
        String apellido = (String) payload.get("apellido");
        String tipoDocumento = (String) payload.get("tipoDocumento");
        String nombreCompleto = ((nombre != null ? nombre : "") + " " + (apellido != null ? apellido : "")).trim();

        Map<String, Object> datos = new HashMap<>();
        datos.put("documentoId", documentoId);
        if (tipoDocumento != null) datos.put("tipoDocumento", tipoDocumento);

        String mensaje = (nombreCompleto.isBlank() ? "Un usuario" : nombreCompleto) + " subió un documento"
                + (tipoDocumento != null ? " (" + tipoDocumento.replace('_', ' ') + ")" : "")
                + " pendiente de verificación.";

        adminNotificador.notificarAdmins("DOCUMENTO_SUBIDO", TipoNotificacion.DOCUMENTO_NUEVO,
                "Nuevo documento para revisar", mensaje,
                "/admin-master/validations/providers?tab=documentos", datos);
    }

    /**
     * Ruta legacy: JSON ad-hoc con campo {@code tipo}. Se elimina en Ola 4.
     */
    private void manejarLegacy(String mensaje) throws Exception {
        Map<String, Object> payload = objectMapper.readValue(mensaje, new TypeReference<>() {});
        String tipo = (String) payload.get("tipo");
        Long usuarioId = toLong(payload.get("usuarioId"));
        String nombre = (String) payload.get("nombre");

        if (usuarioId == null) {
            log.warn("[NOTIF] user-approval legacy sin usuarioId: {}", payload);
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
            default -> log.debug("[NOTIF] user-approval legacy tipo desconocido: {}", tipo);
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
