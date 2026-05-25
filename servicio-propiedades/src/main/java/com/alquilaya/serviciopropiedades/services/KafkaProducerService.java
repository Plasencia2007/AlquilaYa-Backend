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
