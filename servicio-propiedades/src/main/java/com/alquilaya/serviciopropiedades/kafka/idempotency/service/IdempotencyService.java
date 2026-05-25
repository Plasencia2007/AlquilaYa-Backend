package com.alquilaya.serviciopropiedades.kafka.idempotency.service;

import com.alquilaya.serviciopropiedades.kafka.idempotency.entity.ProcessedEvent;
import com.alquilaya.serviciopropiedades.kafka.idempotency.repository.ProcessedEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Servicio canónico de idempotencia para consumers Kafka. Ver
 * docs/consistencia/02-convenciones.md §6.
 *
 * Patrón:
 *   {@code if (!idempotencyService.marcarComoProcesado(eventId, CONSUMER_NAME)) return;}
 *
 * SIEMPRE invocado dentro de la {@code @Transactional} del consumer para que si
 * el efecto de negocio falla, la fila de processed_events haga rollback junto y
 * el siguiente reintento de Kafka pueda re-procesar el evento.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final ProcessedEventRepository repo;

    /**
     * @return true si el evento es NUEVO y debe procesarse; false si ya estaba registrado.
     */
    public boolean marcarComoProcesado(UUID eventId, String consumerName) {
        if (eventId == null) {
            // Eventos legacy no tienen eventId. Política: dejar pasar (mejor doble que perder).
            return true;
        }
        try {
            repo.save(new ProcessedEvent(eventId, consumerName, LocalDateTime.now()));
            return true;
        } catch (DataIntegrityViolationException e) {
            log.debug("Evento {} ya procesado por consumer {}", eventId, consumerName);
            return false;
        }
    }
}
