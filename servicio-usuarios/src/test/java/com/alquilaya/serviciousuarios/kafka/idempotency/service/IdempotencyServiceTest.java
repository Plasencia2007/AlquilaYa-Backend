package com.alquilaya.serviciousuarios.kafka.idempotency.service;

import com.alquilaya.serviciousuarios.kafka.idempotency.entity.ProcessedEvent;
import com.alquilaya.serviciousuarios.kafka.idempotency.repository.ProcessedEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests unitarios del flujo de idempotencia.
 *
 * Política:
 *   - Primera llamada con (eventId, consumer) NUEVO → true.
 *   - Segunda llamada con mismo (eventId, consumer) → false (PK violation capturada).
 *   - eventId == null (mensaje legacy)             → true (mejor procesar dos veces que perder).
 */
@ExtendWith(MockitoExtension.class)
class IdempotencyServiceTest {

    private static final String CONSUMER = "usuarios-resenas-topic";

    @Mock
    private ProcessedEventRepository repo;

    @InjectMocks
    private IdempotencyService service;

    @Test
    void primeraLlamadaConEventIdNuevo_retornaTrue() {
        UUID eventId = UUID.randomUUID();
        when(repo.save(any(ProcessedEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        boolean resultado = service.marcarComoProcesado(eventId, CONSUMER);

        assertThat(resultado).isTrue();
        verify(repo, times(1)).save(any(ProcessedEvent.class));
    }

    @Test
    void segundaLlamadaConMismoEventId_retornaFalse() {
        UUID eventId = UUID.randomUUID();
        when(repo.save(any(ProcessedEvent.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key"));

        boolean resultado = service.marcarComoProcesado(eventId, CONSUMER);

        assertThat(resultado).isFalse();
        verify(repo, times(1)).save(any(ProcessedEvent.class));
    }

    @Test
    void eventIdNull_retornaTrueSinTocarRepo() {
        boolean resultado = service.marcarComoProcesado(null, CONSUMER);

        assertThat(resultado).isTrue();
        verify(repo, times(0)).save(any(ProcessedEvent.class));
    }
}
