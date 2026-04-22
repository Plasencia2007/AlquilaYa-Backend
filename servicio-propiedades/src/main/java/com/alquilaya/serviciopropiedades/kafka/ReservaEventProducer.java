package com.alquilaya.serviciopropiedades.kafka;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservaEventProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String TOPIC = "reserva-events";

    public void emitir(String tipo, Long reservaId, Map<String, Object> extra) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("tipo", tipo);
        payload.put("reservaId", reservaId);
        if (extra != null) payload.putAll(extra);

        try {
            String json = objectMapper.writeValueAsString(payload);
            log.info("📤 [RESERVA] Emitiendo {} para reserva {}", tipo, reservaId);
            kafkaTemplate.send(TOPIC, json);
        } catch (JsonProcessingException e) {
            log.error("❌ Error serializando evento reserva: {}", e.getMessage());
        }
    }
}
