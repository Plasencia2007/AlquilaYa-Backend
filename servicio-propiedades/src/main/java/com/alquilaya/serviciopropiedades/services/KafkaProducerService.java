package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.outbox.publisher.OutboxPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Productor de eventos de Propiedad y Reseña. Tras Ola 2 ya no toca {@code KafkaTemplate}
 * directamente — pasa por {@link OutboxPublisher} para garantizar atomicidad
 * con la transacción de negocio (patrón Transactional Outbox).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class KafkaProducerService {

    private static final String TOPIC_PROPIEDADES = "propiedades-topic";
    private static final String TOPIC_RESENAS = "resenas-topic";

    private final OutboxPublisher outboxPublisher;

    /**
     * Mantenida por compatibilidad — recibe el string legacy ad-hoc del caller.
     * Hasta que todos los call sites usen el método tipado nuevo, se publica como
     * {@code PROPIEDAD_ACTUALIZADA} con payload {@code {raw: <mensaje>}}.
     */
    public void enviarEventoPropiedad(String mensaje) {
        log.info("[PROPIEDAD] (legacy) Persistiendo evento en outbox: {}", mensaje);
        Map<String, Object> payload = new HashMap<>();
        payload.put("raw", mensaje);
        try {
            outboxPublisher.publicar(
                    TOPIC_PROPIEDADES,
                    "PROPIEDAD_ACTUALIZADA",
                    "Propiedad",
                    "0",
                    payload,
                    MDC.get("correlationId"));
        } catch (Exception e) {
            log.warn("No se pudo persistir evento en outbox ({}): {}", TOPIC_PROPIEDADES, e.getMessage());
        }
    }

    /**
     * Sobrecarga tipada para eventos de propiedad. Persiste en outbox con
     * {@code aggregateId = propiedadId} y el payload provisto.
     */
    public void enviarEventoPropiedad(String eventType, Long propiedadId, Map<String, Object> payload) {
        log.info("[PROPIEDAD] Persistiendo en outbox {} para propiedad {}", eventType, propiedadId);
        Map<String, Object> body = payload != null ? new HashMap<>(payload) : new HashMap<>();
        body.putIfAbsent("propiedadId", propiedadId);
        outboxPublisher.publicar(
                TOPIC_PROPIEDADES,
                eventType,
                "Propiedad",
                String.valueOf(propiedadId),
                body,
                MDC.get("correlationId"));
    }

    /**
     * Métricas de actividad del ARRENDADOR (reservas completadas/fallidas) para el
     * score agregado de reputación (#26, Fase 2). Va al mismo topic de señales de
     * reputación que las reseñas; servicio-usuarios lo consume.
     */
    public void enviarActividadArrendador(Long arrendadorId, long completadas, long fallidas) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("arrendadorId", arrendadorId);
        payload.put("completadas", completadas);
        payload.put("fallidas", fallidas);
        try {
            outboxPublisher.publicar(TOPIC_RESENAS, "ACTIVIDAD_ARRENDADOR_ACTUALIZADA",
                    "Arrendador", String.valueOf(arrendadorId), payload, MDC.get("correlationId"));
        } catch (Exception e) {
            log.warn("No se pudo persistir actividad arrendador en outbox: {}", e.getMessage());
        }
    }

    /** Métricas de actividad del ESTUDIANTE (buen inquilino) para el score agregado (#26, Fase 2). */
    public void enviarActividadEstudiante(Long estudianteId, long completadas, long fallidas) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("estudianteId", estudianteId);
        payload.put("completadas", completadas);
        payload.put("fallidas", fallidas);
        try {
            outboxPublisher.publicar(TOPIC_RESENAS, "ACTIVIDAD_ESTUDIANTE_ACTUALIZADA",
                    "Estudiante", String.valueOf(estudianteId), payload, MDC.get("correlationId"));
        } catch (Exception e) {
            log.warn("No se pudo persistir actividad estudiante en outbox: {}", e.getMessage());
        }
    }

    public void enviarCalificacionArrendador(Long arrendadorId, Double calificacion, long numResenas) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("arrendadorId", arrendadorId);
        payload.put("calificacion", calificacion);
        payload.put("numResenas", numResenas);
        try {
            outboxPublisher.publicar(
                    TOPIC_RESENAS,
                    "CALIFICACION_ARRENDADOR_ACTUALIZADA",
                    "Resena",
                    String.valueOf(arrendadorId),
                    payload,
                    MDC.get("correlationId"));
            log.info("Calificacion arrendador {} persistida en outbox: {} ({} reseñas)",
                    arrendadorId, calificacion, numResenas);
        } catch (Exception e) {
            log.warn("No se pudo persistir calificacion en outbox ({}): {}",
                    TOPIC_RESENAS, e.getMessage());
        }
    }

    /**
     * Notifica que una propiedad recibió una reseña nueva (#337). servicio-notificaciones
     * consume {@code resenas-topic} y la traduce a un WhatsApp para el arrendador dueño.
     * {@code arrendadorTelefono} viaja ya resuelto (Feign, best-effort) porque el consumidor
     * de notificaciones no tiene forma propia de obtenerlo — mismo patrón que
     * {@code ReservaService.enriquecerYEmitir} para los eventos de reserva.
     */
    public void enviarResenaCreada(Long propiedadId, Long arrendadorId, String propiedadTitulo,
                                    Integer calificacion, String arrendadorTelefono) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("propiedadId", propiedadId);
        payload.put("arrendadorId", arrendadorId);
        payload.put("propiedadTitulo", propiedadTitulo);
        payload.put("calificacion", calificacion);
        payload.put("arrendadorTelefono", arrendadorTelefono);
        try {
            outboxPublisher.publicar(
                    TOPIC_RESENAS,
                    "RESENA_PROPIEDAD_CREADA",
                    "Resena",
                    String.valueOf(propiedadId),
                    payload,
                    MDC.get("correlationId"));
            log.info("Reseña de propiedad {} (calificacion={}) persistida en outbox para notificar a arrendador {}",
                    propiedadId, calificacion, arrendadorId);
        } catch (Exception e) {
            log.warn("No se pudo persistir evento RESENA_PROPIEDAD_CREADA en outbox ({}): {}",
                    TOPIC_RESENAS, e.getMessage());
        }
    }

    /**
     * Notificaciones admin (gap #2/3, mismo PoC del ítem 378): una denuncia nueva sobre una
     * propiedad debe alertar a TODOS los admins activos. Va al mismo {@code TOPIC_PROPIEDADES}
     * que el resto de eventos de este agregado — servicio-mensajeria lo consume desde
     * {@code PropiedadEventConsumer} sin necesidad de suscribirse a un topic nuevo.
     */
    public void enviarDenunciaCreada(Long denunciaId, Long propiedadId, String propiedadTitulo, String motivo) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("denunciaId", denunciaId);
        payload.put("propiedadId", propiedadId);
        payload.put("propiedadTitulo", propiedadTitulo);
        payload.put("motivo", motivo);
        try {
            outboxPublisher.publicar(
                    TOPIC_PROPIEDADES,
                    "DENUNCIA_CREADA",
                    "Denuncia",
                    String.valueOf(denunciaId),
                    payload,
                    MDC.get("correlationId"));
            log.info("Denuncia {} (propiedad={}, motivo={}) persistida en outbox para notificar admins",
                    denunciaId, propiedadId, motivo);
        } catch (Exception e) {
            log.warn("No se pudo persistir evento DENUNCIA_CREADA en outbox ({}): {}",
                    TOPIC_PROPIEDADES, e.getMessage());
        }
    }

    /**
     * Notificaciones admin (gap #2/3): una propiedad pasó a PENDIENTE (publicación de un
     * borrador, o reenvío tras corregir un rechazo — #348) y necesita revisión. Alerta a
     * TODOS los admins activos, igual que {@link #enviarDenunciaCreada}.
     */
    public void enviarPropiedadPendiente(Long propiedadId, String titulo, Long arrendadorId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("propiedadId", propiedadId);
        payload.put("titulo", titulo);
        payload.put("arrendadorId", arrendadorId);
        try {
            outboxPublisher.publicar(
                    TOPIC_PROPIEDADES,
                    "PROPIEDAD_PENDIENTE",
                    "Propiedad",
                    String.valueOf(propiedadId),
                    payload,
                    MDC.get("correlationId"));
            log.info("Propiedad {} pendiente de revisión persistida en outbox para notificar admins", propiedadId);
        } catch (Exception e) {
            log.warn("No se pudo persistir evento PROPIEDAD_PENDIENTE en outbox ({}): {}",
                    TOPIC_PROPIEDADES, e.getMessage());
        }
    }
}
