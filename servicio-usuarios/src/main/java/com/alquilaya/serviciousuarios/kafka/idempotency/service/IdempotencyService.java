package com.alquilaya.serviciousuarios.kafka.idempotency.service;

import com.alquilaya.serviciousuarios.kafka.idempotency.entity.ProcessedEvent;
import com.alquilaya.serviciousuarios.kafka.idempotency.repository.ProcessedEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Servicio de idempotencia para consumers Kafka.
 *
 * <p>Convención de uso: llamar DENTRO de la {@code @Transactional} del consumer.
 * Si la lógica de negocio posterior falla, la fila de {@code processed_events}
 * hace rollback junto con todo lo demás, y el siguiente reintento de Kafka
 * volverá a entrar.
 */
@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final ProcessedEventRepository repo;

    /**
     * Intenta marcar el evento como procesado por este consumer.
     *
     * @param eventId     UUID del evento (puede ser {@code null} en eventos legacy)
     * @param consumerName nombre canónico del consumer (patrón {@code <servicio>-<topic>})
     * @return {@code true} si el evento es NUEVO y debe procesarse;
     *         {@code false} si YA estaba procesado (descartar silenciosamente).
     */
    public boolean marcarComoProcesado(UUID eventId, String consumerName) {
        if (eventId == null) {
            // Evento legacy sin eventId → no podemos garantizar idempotencia.
            // Política: dejar pasar (mejor procesar dos veces que perder).
            return true;
        }
        try {
            repo.save(new ProcessedEvent(eventId, consumerName, LocalDateTime.now()));
            return true;
        } catch (DataIntegrityViolationException e) {
            // PK (event_id, consumer_name) ya existía → ya fue procesado.
            return false;
        }
    }
}
