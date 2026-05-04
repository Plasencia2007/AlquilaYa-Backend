package com.alquilaya.serviciousuarios.listeners;

import com.alquilaya.serviciousuarios.repositories.ArrendadorRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ResenaEventListener {

    private final ArrendadorRepository arrendadorRepository;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "resenas-topic", groupId = "servicio-usuarios-resenas")
    public void onCalificacionActualizada(String payload) {
        try {
            JsonNode node = objectMapper.readTree(payload);
            Long arrendadorId = node.get("arrendadorId").asLong();
            Double calificacion = node.get("calificacion").asDouble();

            arrendadorRepository.findById(arrendadorId).ifPresent(arrendador -> {
                arrendador.setCalificacion(calificacion);
                arrendadorRepository.save(arrendador);
                log.info("Calificacion arrendador {} actualizada a {}", arrendadorId, calificacion);
            });
        } catch (Exception e) {
            log.error("Error procesando evento resenas-topic: {}", e.getMessage());
        }
    }
}
