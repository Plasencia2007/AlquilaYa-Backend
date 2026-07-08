package com.alquilaya.serviciopropiedades.outbox.scheduler;

import com.alquilaya.serviciopropiedades.outbox.entity.OutboxEvent;
import com.alquilaya.serviciopropiedades.outbox.repository.OutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Drenado periódico de la tabla outbox_events.
 *
 * Política:
 *  - fixedDelay = 2_000ms (sirve también como backoff implícito entre reintentos)
 *  - BATCH_SIZE = 50
 *  - MAX_ATTEMPTS = 5 → DLQ lógico
 *  - SELECT ... FOR UPDATE SKIP LOCKED → soporta múltiples instancias del servicio
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxScheduler {

    private static final int BATCH_SIZE = 50;
    private static final int MAX_ATTEMPTS = 5;

    private final OutboxRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Scheduled(fixedDelay = 2_000L)
    @Transactional
    public void drenar() {
        List<OutboxEvent> pendientes;
        try {
            pendientes = outboxRepository.findPendientesParaPublicar(BATCH_SIZE);
        } catch (Exception e) {
            log.debug("Outbox drenar: no se pudo leer pendientes ({}). Se reintenta en el siguiente ciclo.",
                    e.getMessage());
            return;
        }

        for (OutboxEvent ev : pendientes) {
            if (ev.getAttempts() != null && ev.getAttempts() >= MAX_ATTEMPTS) {
                continue; // DLQ lógico — alarma de observabilidad
            }
            try {
                kafkaTemplate.send(ev.getTopic(), ev.getAggregateId(), ev.getPayload()).get();
                ev.setSentAt(LocalDateTime.now());
                ev.setLastError(null);
                outboxRepository.save(ev);
                log.debug("Outbox publicado eventId={} topic={}", ev.getEventId(), ev.getTopic());
            } catch (Exception e) {
                int prev = ev.getAttempts() != null ? ev.getAttempts() : 0;
                ev.setAttempts(prev + 1);
                ev.setLastError(truncar(e.getMessage(), 4000));
                outboxRepository.save(ev);
                log.warn("Outbox publish falló eventId={} attempt={} err={}",
                        ev.getEventId(), ev.getAttempts(), e.getMessage());
            }
        }
    }

    /**
     * Recuperación de eventos VARADOS (attempts >= MAX). El drenado normal ya no los toca
     * (su query filtra attempts < 5), así que sin esto quedaban perdidos para siempre tras una
     * caída de Kafka mayor a ~10s. Corre cada 5 min: reintenta el envío y ALERTA por ERROR.
     * Seguro: los consumidores son idempotentes (processed_events), reenviar no duplica efectos.
     */
    @Scheduled(fixedDelay = 300_000L)
    @Transactional
    public void recuperarVarados() {
        List<OutboxEvent> varados;
        try {
            varados = outboxRepository.findVarados(BATCH_SIZE);
        } catch (Exception e) {
            log.debug("Outbox recuperar: no se pudo leer varados ({}).", e.getMessage());
            return;
        }
        if (varados.isEmpty()) {
            return;
        }
        log.error("🚨 Outbox: {} evento(s) VARADO(s) (attempts>={}). Reintentando envío...",
                varados.size(), MAX_ATTEMPTS);
        for (OutboxEvent ev : varados) {
            try {
                kafkaTemplate.send(ev.getTopic(), ev.getAggregateId(), ev.getPayload()).get();
                ev.setSentAt(LocalDateTime.now());
                ev.setLastError(null);
                outboxRepository.save(ev);
                log.warn("Outbox VARADO recuperado eventId={} topic={}", ev.getEventId(), ev.getTopic());
            } catch (Exception e) {
                // Ya está en el tope de attempts: no lo incrementamos, se reintenta en el próximo ciclo.
                log.error("Outbox VARADO sigue fallando eventId={} err={}", ev.getEventId(), e.getMessage());
            }
        }
    }

    private static String truncar(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
