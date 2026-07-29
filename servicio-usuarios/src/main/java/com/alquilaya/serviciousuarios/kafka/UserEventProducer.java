package com.alquilaya.serviciousuarios.kafka;

import com.alquilaya.serviciousuarios.outbox.publisher.OutboxPublisher;
import com.alquilaya.serviciousuarios.util.LogMask;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Productor de eventos del agregado {@code Usuario}.
 *
 * <p>Tras Ola 2, ninguno de estos métodos llama directamente a Kafka: persisten
 * en la tabla {@code outbox_events} dentro de la transacción del caller y el
 * {@code OutboxScheduler} drena hacia Kafka. Las firmas públicas se mantienen
 * para no romper callers existentes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserEventProducer {

    private static final String TOPIC_APPROVAL = "user-approval-events";
    private static final String TOPIC_SECURITY = "user-security-events";

    private static final String AGGREGATE_USUARIO = "Usuario";
    private static final String AGGREGATE_DOCUMENTO = "DocumentoVerificacion";

    private final OutboxPublisher outboxPublisher;

    public void emitirEventoAprobacion(Long usuarioId, String correo, String nombre, String telefono, String rol) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("usuarioId", usuarioId);
        payload.put("correo", correo);
        payload.put("nombre", nombre);
        payload.put("telefono", telefono);
        payload.put("rol", rol); // ESTUDIANTE | ARRENDADOR → la notificación se adapta al rol

        log.info("📤 Persistiendo en outbox USER_APROBADO usuario={} ({})", usuarioId, LogMask.email(correo));
        outboxPublisher.publicar(
                TOPIC_APPROVAL,
                "USER_APROBADO",
                AGGREGATE_USUARIO,
                String.valueOf(usuarioId),
                payload,
                MDC.get("correlationId"));
    }

    public void emitirEventoRechazo(Long usuarioId, String correo, String nombre, String telefono, String motivo, String rol) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("usuarioId", usuarioId);
        payload.put("correo", correo);
        payload.put("nombre", nombre);
        payload.put("telefono", telefono);
        payload.put("motivo", motivo);
        payload.put("rol", rol); // ESTUDIANTE | ARRENDADOR → la notificación se adapta al rol

        log.info("📤 Persistiendo en outbox USER_RECHAZADO usuario={} ({})", usuarioId, LogMask.email(correo));
        outboxPublisher.publicar(
                TOPIC_APPROVAL,
                "USER_RECHAZADO",
                AGGREGATE_USUARIO,
                String.valueOf(usuarioId),
                payload,
                MDC.get("correlationId"));
    }

    /**
     * Ítem 378 (PoC de notificaciones admin): emite un evento cuando un usuario sube un
     * documento de verificación nuevo, para que servicio-mensajeria notifique a TODOS los
     * admins activos que hay algo pendiente de revisar (no solo al usuario dueño del
     * documento, como en aprobación/rechazo). Reusa el mismo topic que
     * {@link #emitirEventoAprobacion} — es el mismo agregado {@code Usuario}/KYC y así el
     * consumer existente ({@code UserApprovalEventConsumer}) no necesita suscribirse a un
     * topic nuevo.
     */
    public void emitirEventoDocumentoSubido(Long documentoId, Long usuarioId, String correo,
                                            String nombre, String apellido, String tipoDocumento) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("documentoId", documentoId);
        payload.put("usuarioId", usuarioId);
        payload.put("correo", correo);
        payload.put("nombre", nombre);
        payload.put("apellido", apellido);
        payload.put("tipoDocumento", tipoDocumento);

        log.info("📤 Persistiendo en outbox DOCUMENTO_SUBIDO documento={} usuario={} ({})",
                documentoId, usuarioId, LogMask.email(correo));
        outboxPublisher.publicar(
                TOPIC_APPROVAL,
                "DOCUMENTO_SUBIDO",
                AGGREGATE_DOCUMENTO,
                String.valueOf(documentoId),
                payload,
                MDC.get("correlationId"));
    }

    /**
     * Emite alerta de seguridad cuando una cuenta se bloquea por intentos
     * fallidos de login. Consume servicio-mensajeria → notif WhatsApp/in-app.
     */
    public void emitirAlertaIntentosFallidos(Long usuarioId, String correo, String telefono, String ip) {
        Long idSafe = usuarioId == null ? 0L : usuarioId;
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("usuarioId", idSafe);
        payload.put("correo", correo == null ? "" : correo);
        payload.put("telefono", telefono == null ? "" : telefono);
        payload.put("ip", ip == null ? "" : ip);

        log.info("📤 Persistiendo en outbox USER_INTENTOS_FALLIDOS {} (ip={})", LogMask.email(correo), ip);
        outboxPublisher.publicar(
                TOPIC_SECURITY,
                "USER_INTENTOS_FALLIDOS",
                AGGREGATE_USUARIO,
                String.valueOf(idSafe),
                payload,
                MDC.get("correlationId"));
    }
}
