package com.alquilaya.servicio_mensajeria.kafka;

import com.alquilaya.servicio_mensajeria.enums.TipoNotificacion;
import com.alquilaya.servicio_mensajeria.kafka.envelope.EventEnvelope;
import com.alquilaya.servicio_mensajeria.kafka.idempotency.service.IdempotencyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * Notif admin (gap #2/3 del panel de notificaciones): escucha {@code propiedades-topic}
 * (productor: servicio-propiedades, {@code KafkaProducerService}) y notifica a TODOS los
 * admins ACTIVOS cuando hay algo nuevo por revisar — mismo patrón que
 * {@code UserApprovalEventConsumer} caso {@code DOCUMENTO_SUBIDO} (ítem 378).
 *
 * <p>A diferencia de {@code ReservaEventConsumer}/{@code PagoEventConsumer}, este consumer
 * es nuevo desde cero: todo lo que llega a {@code propiedades-topic} pasa SIEMPRE por
 * {@code OutboxPublisher} (confirmado leyendo {@code OutboxPublisher#publicar} y
 * {@code KafkaProducerService} en servicio-propiedades), que envuelve cada mensaje en el
 * envelope estándar ({@code eventType} en la raíz, datos del evento en {@code payload}, NO al
 * revés). Por eso NO hay rama legacy aquí — un mensaje sin envelope válido simplemente se
 * descarta con un warning, no hace falta el fallback ad-hoc que sí cargan los consumers viejos
 * (esos datan de antes de la migración al outbox transaccional).
 *
 * <p>Eventos manejados:
 *  - {@code DENUNCIA_CREADA}: una denuncia nueva sobre una propiedad (emitido desde
 *    {@code DenunciaService#crear}).
 *  - {@code PROPIEDAD_PENDIENTE}: una propiedad pasó a PENDIENTE — publicación de un
 *    borrador ({@code PublicacionService#publicarBorrador}) o reenvío tras corregir un
 *    rechazo ({@code PropiedadController#actualizarPropiedad}, ítem 348).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PropiedadEventConsumer {

    private static final String CONSUMER_NAME = "mensajeria-propiedades-topic";

    private final IdempotencyService idempotencyService;
    private final AdminNotificador adminNotificador;

    @KafkaListener(topics = "propiedades-topic", groupId = "mensajeria-notif-group")
    @Transactional
    public void escuchar(String mensaje) {
        log.info("📥 [NOTIF] propiedades-topic recibido");
        if (mensaje == null || mensaje.isBlank()) return;

        try {
            EventEnvelope ev = EventEnvelope.parseOrLegacy(mensaje);
            if (ev == null) {
                log.debug("[NOTIF] propiedades-topic mensaje sin envelope válido, ignorado: {}", mensaje);
                return;
            }
            if (!idempotencyService.marcarComoProcesado(ev.getEventId(), CONSUMER_NAME)) {
                log.debug("[NOTIF] propiedades-topic eventId={} ya procesado", ev.getEventId());
                return;
            }
            manejarEnvelope(ev);
        } catch (Exception e) {
            log.error("Fallo procesando propiedades-topic: {}", e.getMessage(), e);
            throw new RuntimeException(e); // rollback → reintento por Kafka
        }
    }

    private void manejarEnvelope(EventEnvelope ev) {
        Map<String, Object> payload = ev.getPayload() != null ? ev.getPayload() : new HashMap<>();
        String eventType = ev.getEventType() == null ? "" : ev.getEventType().toUpperCase();

        switch (eventType) {
            case "DENUNCIA_CREADA" -> notificarDenunciaCreada(payload);
            case "PROPIEDAD_PENDIENTE" -> notificarPropiedadPendiente(payload);
            default -> log.debug("[NOTIF] propiedades-topic eventType desconocido/no manejado: {}", eventType);
        }
    }

    private void notificarDenunciaCreada(Map<String, Object> payload) {
        Long denunciaId = toLong(payload.get("denunciaId"));
        Long propiedadId = toLong(payload.get("propiedadId"));
        String propiedadTitulo = (String) payload.get("propiedadTitulo");
        String motivo = (String) payload.get("motivo");

        Map<String, Object> datos = new HashMap<>();
        datos.put("denunciaId", denunciaId);
        datos.put("propiedadId", propiedadId);
        if (motivo != null) datos.put("motivo", motivo);

        String mensaje = "Nueva denuncia" + (motivo != null ? " (" + motivo.replace('_', ' ') + ")" : "")
                + " sobre \"" + (propiedadTitulo != null ? propiedadTitulo : "una propiedad") + "\".";

        adminNotificador.notificarAdmins("DENUNCIA_CREADA", TipoNotificacion.DENUNCIA_NUEVA,
                "Nueva denuncia por revisar", mensaje, "/admin-master/moderation", datos);
    }

    private void notificarPropiedadPendiente(Map<String, Object> payload) {
        Long propiedadId = toLong(payload.get("propiedadId"));
        String titulo = (String) payload.get("titulo");
        Long arrendadorId = toLong(payload.get("arrendadorId"));

        Map<String, Object> datos = new HashMap<>();
        datos.put("propiedadId", propiedadId);
        if (arrendadorId != null) datos.put("arrendadorId", arrendadorId);

        String mensaje = "\"" + (titulo != null ? titulo : "Una propiedad") + "\" quedó pendiente de revisión.";

        adminNotificador.notificarAdmins("PROPIEDAD_PENDIENTE", TipoNotificacion.PROPIEDAD_PENDIENTE,
                "Nueva propiedad por revisar", mensaje, "/admin-master/properties/to-review", datos);
    }

    private static Long toLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try { return Long.parseLong(v.toString()); } catch (NumberFormatException e) { return null; }
    }
}
