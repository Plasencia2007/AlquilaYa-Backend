package com.alquilaya.serviciousuarios.outbox.scheduler;

import com.alquilaya.serviciousuarios.outbox.entity.OutboxEvent;
import com.alquilaya.serviciousuarios.outbox.repository.OutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Drena periódicamente la tabla {@code outbox_events} hacia Kafka.
 *
 * <p>Política:
 * <ul>
 *   <li>Cada 2s lee hasta 50 eventos pendientes con {@code FOR UPDATE SKIP LOCKED}.</li>
 *   <li>Tras 5 intentos fallidos, el evento queda como DLQ lógico (sent_at NULL,
 *       attempts >= 5, last_error con el motivo). Una alerta debe disparar en
 *       {@code count(*) WHERE attempts >= 5 AND sent_at IS NULL > 0}.</li>
 *   <li>El backoff entre reintentos es implícito: el siguiente ciclo de 2s
 *       reintentará. No usa {@code Thread.sleep}.</li>
 * </ul>
 *
 * <p>Es el ÚNICO componente que llama a {@code KafkaTemplate.send} en este
 * servicio. La lógica de negocio jamás debe invocar Kafka directamente.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxScheduler {

    private static final int BATCH_SIZE   = 50;
    private static final int MAX_ATTEMPTS = 5;

    private final OutboxRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Scheduled(fixedDelay = 2_000L)
    @Transactional
    public void drenar() {
        List<OutboxEvent> pendientes = outboxRepository.findPendientesParaPublicar(BATCH_SIZE);
        if (pendientes.isEmpty()) return;

        for (OutboxEvent ev : pendientes) {
            if (ev.getAttempts() != null && ev.getAttempts() >= MAX_ATTEMPTS) {
                // DLQ lógico: se deja en BD para observabilidad.
                continue;
            }
            try {
                kafkaTemplate.send(ev.getTopic(), ev.getAggregateId(), ev.getPayload()).get();
                ev.setSentAt(LocalDateTime.now());
                ev.setLastError(null);
                outboxRepository.save(ev);
                log.debug("Outbox publicado eventId={} type={} topic={}",
                        ev.getEventId(), ev.getEventType(), ev.getTopic());
            } catch (Exception e) {
                int attempts = (ev.getAttempts() == null ? 0 : ev.getAttempts()) + 1;
                ev.setAttempts(attempts);
                ev.setLastError(truncar(e.getMessage(), 4000));
                outboxRepository.save(ev);
                log.warn("Outbox publish falló eventId={} attempt={} err={}",
                        ev.getEventId(), attempts, e.getMessage());
            }
        }
    }

    private static String truncar(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
