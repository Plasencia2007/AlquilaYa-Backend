package com.alquilaya.servicio_mensajeria.kafka;

import com.alquilaya.servicio_mensajeria.kafka.envelope.EventEnvelope;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Productor de señales de reputación hacia {@code resenas-topic}.
 *
 * <p>Emite el {@link EventEnvelope} canónico como JSON string (los serializers de Kafka
 * son String/String, ver config-server/application.yml). servicio-usuarios lo consume con
 * su propio {@code EventEnvelope.parseOrLegacy(raw)} y despacha por {@code eventType}, así
 * que la forma del JSON —{@code eventId}, {@code eventType}, {@code payload}— debe coincidir
 * con la que ya produce servicio-propiedades a este mismo topic.
 *
 * <p>El {@code KafkaTemplate<String,String>} es el bean autoconfigurado por Spring Boot
 * (el mismo que usa {@code KafkaErrorHandlerConfig} para la DLT).
 */
@Slf4j
@Component
public class ReputacionMetricaProducer {

    private static final String TOPIC_RESENAS = "resenas-topic";
    private static final String EVENT_TIEMPO_RESPUESTA = "TIEMPO_RESPUESTA_ARRENDADOR_ACTUALIZADO";

    /** findAndRegisterModules() registra JavaTimeModule para serializar {@code occurredAt} (Instant). */
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final String applicationName;

    public ReputacionMetricaProducer(KafkaTemplate<String, String> kafkaTemplate,
                                     @Value("${spring.application.name:servicio-mensajeria}") String applicationName) {
        this.kafkaTemplate = kafkaTemplate;
        this.applicationName = applicationName;
    }

    /**
     * Emite {@code TIEMPO_RESPUESTA_ARRENDADOR_ACTUALIZADO} para un arrendador.
     *
     * @param arrendadorId            perfilId del arrendador ({@code Conversacion.arrendadorId}).
     * @param tiempoRespuestaMinutos  promedio en minutos (redondeado); puede ser {@code null}
     *                                si no hay datos suficientes.
     */
    public void emitirTiempoRespuesta(Long arrendadorId, Integer tiempoRespuestaMinutos) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("arrendadorId", arrendadorId);
        payload.put("tiempoRespuestaMinutos", tiempoRespuestaMinutos);

        EventEnvelope env = new EventEnvelope();
        // eventId único por emisión (idempotencia del consumidor; NO reutilizar arrendadorId,
        // o usuarios ignoraría los recálculos posteriores del mismo arrendador).
        env.setEventId(UUID.randomUUID());
        env.setEventType(EVENT_TIEMPO_RESPUESTA);
        env.setEventVersion(1);
        env.setOccurredAt(Instant.now());
        env.setSource(applicationName);
        env.setAggregateType("Arrendador");
        env.setAggregateId(String.valueOf(arrendadorId));
        env.setCorrelationId(MDC.get("correlationId"));
        env.setPayload(payload);

        try {
            String json = objectMapper.writeValueAsString(env);
            // Key = arrendadorId → todas las señales del mismo arrendador caen en la misma
            // partición y conservan orden relativo.
            kafkaTemplate.send(TOPIC_RESENAS, String.valueOf(arrendadorId), json);
            log.debug("[METRICA] emitido {} arrendador={} minutos={} eventId={}",
                    EVENT_TIEMPO_RESPUESTA, arrendadorId, tiempoRespuestaMinutos, env.getEventId());
        } catch (Exception e) {
            // Se relanza para que el orquestador cuente el fallo por-arrendador; no debe
            // tumbar el resto del lote.
            throw new IllegalStateException(
                    "No se pudo emitir tiempo de respuesta del arrendador " + arrendadorId, e);
        }
    }
}
