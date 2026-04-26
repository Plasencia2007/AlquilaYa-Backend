package com.alquilaya.serviciousuarios.kafka;

import com.alquilaya.serviciousuarios.util.LogMask;
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
    private static final String TOPIC_SECURITY = "user-security-events";

    public void emitirEventoAprobacion(Long usuarioId, String correo, String nombre, String telefono) {
        String mensaje = String.format(
                "{\"tipo\":\"APROBACION\", \"usuarioId\":%d, \"correo\":\"%s\", \"nombre\":\"%s\", \"telefono\":\"%s\"}",
                usuarioId, correo, nombre, telefono);

        log.info("📤 Emitiendo evento de aprobación para usuario {} ({})", usuarioId, LogMask.email(correo));
        kafkaTemplate.send(TOPIC, mensaje);
    }

    public void emitirEventoRechazo(Long usuarioId, String correo, String nombre, String telefono, String motivo) {
        String mensaje = String.format(
                "{\"tipo\":\"RECHAZO\", \"usuarioId\":%d, \"correo\":\"%s\", \"nombre\":\"%s\", \"telefono\":\"%s\", \"motivo\":\"%s\"}",
                usuarioId, correo, nombre, telefono, motivo);

        log.info("📤 Emitiendo evento de rechazo para usuario {} ({})", usuarioId, LogMask.email(correo));
        kafkaTemplate.send(TOPIC, mensaje);
    }

    /**
     * Emite alerta de seguridad cuando una cuenta se bloquea por intentos
     * fallidos de login. Consume servicio-mensajeria → notif WhatsApp/in-app.
     */
    public void emitirAlertaIntentosFallidos(Long usuarioId, String correo, String telefono, String ip) {
        String mensaje = String.format(
                "{\"tipo\":\"INTENTOS_FALLIDOS\", \"usuarioId\":%d, \"correo\":\"%s\", \"telefono\":\"%s\", \"ip\":\"%s\"}",
                usuarioId == null ? 0L : usuarioId,
                correo == null ? "" : correo,
                telefono == null ? "" : telefono,
                ip == null ? "" : ip);

        log.info("📤 Emitiendo alerta intentos fallidos para {} (ip={})", LogMask.email(correo), ip);
        kafkaTemplate.send(TOPIC_SECURITY, mensaje);
    }
}
