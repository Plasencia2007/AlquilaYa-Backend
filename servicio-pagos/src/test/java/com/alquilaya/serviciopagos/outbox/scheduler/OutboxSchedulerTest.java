package com.alquilaya.serviciopagos.outbox.scheduler;

import com.alquilaya.serviciopagos.outbox.entity.OutboxEvent;
import com.alquilaya.serviciopagos.outbox.repository.OutboxRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests unitarios de {@link OutboxScheduler}.
 *
 * Flujo dorado:
 *   - El scheduler obtiene N eventos pendientes del repository.
 *   - Para cada uno hace kafkaTemplate.send(topic, key, payload).get().
 *   - Tras success: sent_at != null, lastError = null, repository.save(ev) invocado.
 */
@ExtendWith(MockitoExtension.class)
class OutboxSchedulerTest {

    @Mock
    private OutboxRepository outboxRepository;

    @Mock
    @SuppressWarnings("rawtypes")
    private KafkaTemplate kafkaTemplate;

    @InjectMocks
    private OutboxScheduler scheduler;

    private static OutboxEvent evento(long id, String topic, String aggregateId, String payload) {
        // Reproducimos manualmente lo que onCreate() haría en runtime (@PrePersist):
        // - createdAt = now() si null
        // - attempts = 0 si null
        return OutboxEvent.builder()
                .id(id)
                .eventId(UUID.randomUUID())
                .aggregateType("Pago")
                .aggregateId(aggregateId)
                .eventType("PAGO_EXITOSO")
                .topic(topic)
                .payload(payload)
                .createdAt(java.time.LocalDateTime.now())
                .attempts(0)
                .build();
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static CompletableFuture<SendResult<String, String>> futureSuccess(String topic) {
        // El scheduler hace .get() y descarta el resultado; basta con un future completado.
        return CompletableFuture.completedFuture((SendResult<String, String>) null);
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void drenar_dosEventosPendientesYKafkaOk_marcaSentAtNotNull() {
        OutboxEvent ev1 = evento(1L, "pagos-topic", "10", "{\"eventType\":\"PAGO_EXITOSO\"}");
        OutboxEvent ev2 = evento(2L, "pagos-topic", "11", "{\"eventType\":\"PAGO_EXITOSO\"}");

        when(outboxRepository.findPendientesParaPublicar(anyInt())).thenReturn(List.of(ev1, ev2));
        when(kafkaTemplate.send(eq("pagos-topic"), anyString(), anyString()))
                .thenReturn(futureSuccess("pagos-topic"));

        scheduler.drenar();

        assertThat(ev1.getSentAt()).isNotNull();
        assertThat(ev1.getLastError()).isNull();
        assertThat(ev2.getSentAt()).isNotNull();
        assertThat(ev2.getLastError()).isNull();

        ArgumentCaptor<OutboxEvent> captor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outboxRepository, times(2)).save(captor.capture());
        assertThat(captor.getAllValues()).hasSize(2);
        verify(kafkaTemplate, times(2)).send(eq("pagos-topic"), anyString(), anyString());
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void drenar_kafkaFalla_incrementaAttemptsYRegistraError() {
        OutboxEvent ev = evento(1L, "pagos-topic", "10", "{}");
        when(outboxRepository.findPendientesParaPublicar(anyInt())).thenReturn(List.of(ev));

        CompletableFuture<SendResult<String, String>> failed = new CompletableFuture<>();
        failed.completeExceptionally(new RuntimeException("broker down"));
        when(kafkaTemplate.send(eq("pagos-topic"), anyString(), anyString()))
                .thenReturn(failed);

        scheduler.drenar();

        assertThat(ev.getSentAt()).isNull();
        assertThat(ev.getAttempts()).isEqualTo(1);
        assertThat(ev.getLastError()).contains("broker down");
        verify(outboxRepository, times(1)).save(ev);
    }

    @Test
    void drenar_listaVacia_noTocaKafka() {
        when(outboxRepository.findPendientesParaPublicar(anyInt())).thenReturn(List.of());

        scheduler.drenar();

        verify(kafkaTemplate, times(0)).send(anyString(), anyString(), anyString());
        verify(outboxRepository, times(0)).save(org.mockito.ArgumentMatchers.any(OutboxEvent.class));
    }

    @Test
    void drenar_eventoConAttemptsMaximos_seSaltea() {
        OutboxEvent ev = evento(1L, "pagos-topic", "10", "{}");
        ev.setAttempts(5); // ≥ MAX_ATTEMPTS = DLQ lógico
        when(outboxRepository.findPendientesParaPublicar(anyInt())).thenReturn(List.of(ev));

        scheduler.drenar();

        verify(kafkaTemplate, times(0)).send(anyString(), anyString(), anyString());
        verify(outboxRepository, times(0)).save(org.mockito.ArgumentMatchers.any(OutboxEvent.class));
        assertThat(ev.getSentAt()).isNull();
    }
}
