package com.alquilaya.servicio_mensajeria.kafka.idempotency.service;

import com.alquilaya.servicio_mensajeria.kafka.idempotency.entity.ProcessedEvent;
import com.alquilaya.servicio_mensajeria.kafka.idempotency.repository.ProcessedEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Marca eventos como procesados (tabla {@code processed_events}) para
 * garantizar idempotencia at-least-once → exactly-once a nivel aplicación.
 *
 * Ver docs/consistencia/02-convenciones.md sección 6.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IdempotencyService {

    private final ProcessedEventRepository repo;

    /**
     * Intenta marcar el evento como procesado por este consumer.
     *
     * @return {@code true} si el evento es NUEVO y debe procesarse;
     *         {@code false} si YA estaba procesado (descartar silenciosamente).
     *
     * Llamar DENTRO de la {@code @Transactional} del consumer. Si la lógica de
     * negocio falla, la fila de {@code processed_events} hace rollback junto
     * con todo lo demás, y el siguiente reintento de Kafka volverá a entrar.
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
            // PK (event_id, consumer_name) ya existía.
            log.debug("Evento ya procesado: eventId={} consumer={}", eventId, consumerName);
            return false;
        }
    }
}
