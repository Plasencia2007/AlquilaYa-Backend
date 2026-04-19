package com.alquilaya.serviciousuarios.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserEventProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private static final String TOPIC = "user-approval-events";

    public void emitirEventoAprobacion(Long usuarioId, String correo, String nombre, String telefono) {
        String mensaje = String.format("{\"tipo\":\"APROBACION\", \"usuarioId\":%d, \"correo\":\"%s\", \"nombre\":\"%s\", \"telefono\":\"%s\"}", 
                usuarioId, correo, nombre, telefono);
        
        log.info("📤 Emitiendo evento de aprobación para usuario {}: {}", usuarioId, correo);
        kafkaTemplate.send(TOPIC, mensaje);
    }

    public void emitirEventoRechazo(Long usuarioId, String correo, String nombre, String telefono, String motivo) {
        String mensaje = String.format("{\"tipo\":\"RECHAZO\", \"usuarioId\":%d, \"correo\":\"%s\", \"nombre\":\"%s\", \"telefono\":\"%s\", \"motivo\":\"%s\"}", 
                usuarioId, correo, nombre, telefono, motivo);
        
        log.info("📤 Emitiendo evento de rechazo para usuario {}: {}", usuarioId, correo);
        kafkaTemplate.send(TOPIC, mensaje);
    }
}
