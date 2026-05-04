package com.alquilaya.serviciopropiedades.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class KafkaProducerService {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private static final String TOPIC_PROPIEDADES = "propiedades-topic";
    private static final String TOPIC_RESENAS = "resenas-topic";

    public void enviarEventoPropiedad(String mensaje) {
        log.info("Enviando evento a Kafka: {}", mensaje);
        try {
            kafkaTemplate.send(TOPIC_PROPIEDADES, mensaje);
        } catch (Exception e) {
            log.warn("No se pudo enviar evento a Kafka ({}): {}", TOPIC_PROPIEDADES, e.getMessage());
        }
    }

    public void enviarCalificacionArrendador(Long arrendadorId, Double calificacion, long numResenas) {
        String payload = String.format(
                "{\"arrendadorId\":%d,\"calificacion\":%.2f,\"numResenas\":%d}",
                arrendadorId, calificacion, numResenas);
        try {
            kafkaTemplate.send(TOPIC_RESENAS, payload);
            log.info("Calificacion arrendador {} enviada a Kafka: {}", arrendadorId, calificacion);
        } catch (Exception e) {
            log.warn("No se pudo enviar calificacion a Kafka ({}): {}", TOPIC_RESENAS, e.getMessage());
        }
    }
}
