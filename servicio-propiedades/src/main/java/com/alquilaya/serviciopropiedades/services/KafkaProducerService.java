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
}
