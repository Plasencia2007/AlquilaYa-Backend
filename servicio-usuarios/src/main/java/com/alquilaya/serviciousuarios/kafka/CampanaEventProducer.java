package com.alquilaya.serviciousuarios.kafka;

import com.alquilaya.serviciousuarios.outbox.publisher.OutboxPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Productor de eventos de campañas de WhatsApp (ítem 381). Sigue el mismo patrón que
 * {@link UserEventProducer}: persiste en la outbox transaccional (no toca Kafka directamente);
 * el {@code OutboxScheduler} existente drena hacia Kafka con sus reintentos habituales — no se
 * duplica esa lógica aquí.
 *
 * <p>Un evento por DESTINATARIO (no uno por campaña con la lista completa adentro), para que
 * {@code servicio-notificaciones/KafkaConsumer.js} reutilice exactamente el mismo patrón de
 * "un mensaje = un evento" que ya usa para OTP/aprobación/reservas — sin tener que iterar listas
 * dentro del consumer ni cambiar su modelo de reintentos por mensaje.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CampanaEventProducer {

    private static final String TOPIC_CAMPANAS = "campanas-whatsapp-events";
    private static final String AGGREGATE_CAMPANA = "CampanaWhatsapp";

    private final OutboxPublisher outboxPublisher;

    public void emitirMensajeCampana(Long campanaId, Long usuarioId, String telefono, String nombre, String mensaje) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("campanaId", campanaId);
        payload.put("usuarioId", usuarioId);
        payload.put("telefono", telefono);
        payload.put("nombre", nombre);
        payload.put("mensaje", mensaje);

        outboxPublisher.publicar(
                TOPIC_CAMPANAS,
                "CAMPANA_WHATSAPP_ENVIAR",
                AGGREGATE_CAMPANA,
                String.valueOf(usuarioId),
                payload,
                MDC.get("correlationId"));
    }
}
