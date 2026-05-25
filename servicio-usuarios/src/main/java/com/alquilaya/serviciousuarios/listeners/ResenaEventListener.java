package com.alquilaya.serviciousuarios.listeners;

import com.alquilaya.serviciousuarios.kafka.idempotency.service.IdempotencyService;
import com.alquilaya.serviciousuarios.outbox.envelope.EventEnvelope;
import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class ResenaEventListener {

    private static final String CONSUMER_NAME = "usuarios-resenas-topic";

    private final ArrendadorRepository arrendadorRepository;
    private final ObjectMapper objectMapper;
    private final IdempotencyService idempotencyService;

    @KafkaListener(topics = "resenas-topic", groupId = "servicio-usuarios-resenas")
    @Transactional
    public void onCalificacionActualizada(String raw) {
        try {
            EventEnvelope ev = EventEnvelope.parseOrLegacy(raw);
            if (ev != null) {
                // === ruta NUEVA (envelope estándar) ===
                if (!idempotencyService.marcarComoProcesado(ev.getEventId(), CONSUMER_NAME)) {
                    log.debug("Evento {} ya procesado por {}, ignorado.", ev.getEventId(), CONSUMER_NAME);
                    return;
                }
                if (!"CALIFICACION_ARRENDADOR_ACTUALIZADA".equals(ev.getEventType())) {
                    log.debug("eventType {} ignorado por {}", ev.getEventType(), CONSUMER_NAME);
                    return;
                }
                JsonNode payload = objectMapper.valueToTree(ev.getPayload());
                aplicarCalificacion(payload);
            } else {
                // === ruta LEGACY === (JSON ad-hoc sin envelope; eliminar en Ola 4)
                JsonNode node = objectMapper.readTree(raw);
                aplicarCalificacion(node);
            }
        } catch (Exception e) {
            log.error("Error procesando evento resenas-topic: {}", e.getMessage(), e);
            // Re-lanza para que la @Transactional haga rollback y Kafka reintente.
            throw new RuntimeException(e);
        }
    }

    private void aplicarCalificacion(JsonNode node) {
        if (node == null || !node.hasNonNull("arrendadorId") || !node.hasNonNull("calificacion")) {
            log.debug("Payload de calificación incompleto: {}", node);
            return;
        }
        Long arrendadorId = node.get("arrendadorId").asLong();
        Double calificacion = node.get("calificacion").asDouble();

        arrendadorRepository.findById(arrendadorId).ifPresent(arrendador -> {
            arrendador.setCalificacion(calificacion);
            arrendadorRepository.save(arrendador);
            log.info("Calificacion arrendador {} actualizada a {}", arrendadorId, calificacion);
        });
    }
}
