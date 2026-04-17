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
    private static final String TOPIC = "propiedades-topic";

    public void enviarEventoPropiedad(String mensaje) {
        log.info("Enviando evento a Kafka: {}", mensaje);
        kafkaTemplate.send(TOPIC, mensaje);
    }
}
