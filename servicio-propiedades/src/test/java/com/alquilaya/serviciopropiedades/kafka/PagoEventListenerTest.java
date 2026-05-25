package com.alquilaya.serviciopropiedades.kafka;

import com.alquilaya.serviciopropiedades.kafka.idempotency.service.IdempotencyService;
import com.alquilaya.serviciopropiedades.outbox.envelope.EventEnvelope;
import com.alquilaya.serviciopropiedades.saga.service.SagaReservaPagoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests unitarios de {@link PagoEventListener} tras la Ola 3 (Saga orquestada).
 *
 * El listener ya no toca {@code ReservaRepository} directamente: delega
 * a {@link SagaReservaPagoService#manejarPagoExitoso(Long, EventEnvelope)}.
 * Por eso los tests verifican la delegación al orquestador, no el save.
 */
@ExtendWith(MockitoExtension.class)
class PagoEventListenerTest {

    @Mock
    @SuppressWarnings("rawtypes")
    private KafkaTemplate kafkaTemplate;

    @Mock
    private IdempotencyService idempotencyService;

    @Mock
    private SagaReservaPagoService sagaReservaPagoService;

    @InjectMocks
    private PagoEventListener listener;

    private static String envelopePagoExitoso(UUID eventId, long reservaId) {
        return """
                {
                  "eventId":      "%s",
                  "eventType":    "PAGO_EXITOSO",
                  "eventVersion": 1,
                  "occurredAt":   "2026-05-25T11:05:42Z",
                  "source":       "servicio-pagos",
                  "aggregateType":"Pago",
                  "aggregateId":  "789",
                  "payload": {
                    "pagoId":    789,
                    "reservaId": %d,
                    "monto":     600.00,
                    "moneda":    "PEN",
                    "paymentId": "1234567890"
                  }
                }
                """.formatted(eventId, reservaId);
    }

    @Test
    void envelopePagoExitoso_idempotenciaOK_delegaAlOrquestadorSaga() {
        UUID eventId = UUID.randomUUID();
        long reservaId = 123L;

        when(idempotencyService.marcarComoProcesado(eq(eventId), anyString())).thenReturn(true);

        listener.escucharPagos(envelopePagoExitoso(eventId, reservaId));

        ArgumentCaptor<EventEnvelope> envCaptor = ArgumentCaptor.forClass(EventEnvelope.class);
        verify(sagaReservaPagoService, times(1)).manejarPagoExitoso(eq(reservaId), envCaptor.capture());
        assertThat(envCaptor.getValue().getEventType()).isEqualTo("PAGO_EXITOSO");
        assertThat(envCaptor.getValue().getEventId()).isEqualTo(eventId);
        verify(kafkaTemplate, never()).send(any(), any(), any());
    }

    @Test
    void envelopePagoExitoso_idempotenciaFalse_consumerNoProcesa() {
        UUID eventId = UUID.randomUUID();
        when(idempotencyService.marcarComoProcesado(eq(eventId), anyString())).thenReturn(false);

        listener.escucharPagos(envelopePagoExitoso(eventId, 123L));

        verify(sagaReservaPagoService, never()).manejarPagoExitoso(any(), any());
    }

    @Test
    void envelopeEventTypeDistinto_seIgnoraSinTocarSaga() {
        String raw = """
                {
                  "eventId":   "1d3f8a44-3a1e-4f33-9c0b-2a4b2b6b7c01",
                  "eventType": "PAGO_FALLIDO",
                  "payload":   {"reservaId": 123}
                }
                """;

        listener.escucharPagos(raw);

        verify(idempotencyService, never()).marcarComoProcesado(any(), anyString());
        verify(sagaReservaPagoService, never()).manejarPagoExitoso(any(), any());
    }

    @Test
    void legacyStringPagoExitoso_delegaAlOrquestadorConEnvelopeNull() {
        // Ruta legacy "PAGO_EXITOSO:<id>" — sin idempotencia (se retira en Ola 4).
        // La saga sigue siendo invocada para evitar divergencia de estado.
        listener.escucharPagos("PAGO_EXITOSO:123");

        verify(sagaReservaPagoService, times(1)).manejarPagoExitoso(eq(123L), isNull());
        verify(idempotencyService, never()).marcarComoProcesado(any(), anyString());
    }
}
