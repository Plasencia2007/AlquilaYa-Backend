package com.alquilaya.serviciopagos.outbox.scheduler;

import com.alquilaya.serviciopagos.outbox.entity.OutboxEvent;
import com.alquilaya.serviciopagos.outbox.repository.OutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Drena la tabla {@code outbox_events} hacia Kafka.
 *
 * <ul>
 *   <li>Intervalo: 2 segundos ({@code fixedDelay}).</li>
 *   <li>Batch: 50 eventos.</li>
 *   <li>Lock pesimista {@code FOR UPDATE SKIP LOCKED} → soporta múltiples réplicas.</li>
 *   <li>Tras {@value #MAX_ATTEMPTS} fallos el evento queda como DLQ lógico (alarmable).</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxScheduler {

    private static final int BATCH_SIZE = 50;
    private static final int MAX_ATTEMPTS = 5;

    private final OutboxRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Scheduled(fixedDelay = 2_000L)
    @Transactional
    public void drenar() {
        List<OutboxEvent> pendientes = outboxRepository.findPendientesParaPublicar(BATCH_SIZE);
        if (pendientes.isEmpty()) {
            return;
        }
        for (OutboxEvent ev : pendientes) {
            if (ev.getAttempts() != null && ev.getAttempts() >= MAX_ATTEMPTS) {
                // DLQ lógico — queda en BD para inspección.
                continue;
            }
            try {
                kafkaTemplate.send(ev.getTopic(), ev.getAggregateId(), ev.getPayload()).get();
                ev.setSentAt(LocalDateTime.now());
                ev.setLastError(null);
                outboxRepository.save(ev);
            } catch (Exception e) {
                int previo = ev.getAttempts() == null ? 0 : ev.getAttempts();
                ev.setAttempts(previo + 1);
                ev.setLastError(truncar(e.getMessage(), 4000));
                outboxRepository.save(ev);
                log.warn("Outbox publish falló eventId={} attempt={} err={}",
                        ev.getEventId(), ev.getAttempts(), e.getMessage());
            }
        }
    }

    private static String truncar(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
