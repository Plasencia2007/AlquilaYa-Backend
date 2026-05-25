package com.alquilaya.serviciopropiedades.outbox.publisher;

import com.alquilaya.serviciopropiedades.outbox.entity.OutboxEvent;
import com.alquilaya.serviciopropiedades.outbox.repository.OutboxRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests unitarios de {@link OutboxPublisher}.
 *
 * Verifica el flujo dorado:
 *   1. publicar(...) construye un envelope con todos los campos canónicos.
 *   2. El envelope serializado tiene eventId, eventType, aggregateId, payload, occurredAt.
 *   3. Se guarda en OutboxRepository sin tocar Kafka (esa responsabilidad es del scheduler).
 */
@ExtendWith(MockitoExtension.class)
class OutboxPublisherTest {

    @Mock
    private OutboxRepository outboxRepository;

    private OutboxPublisher publisher;
    private ObjectMapper jsonMapper;

    @BeforeEach
    void setUp() {
        publisher = new OutboxPublisher(outboxRepository, "servicio-propiedades");
        jsonMapper = new ObjectMapper();
        when(outboxRepository.save(any(OutboxEvent.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void publicar_conTodosLosCampos_guardaOutboxEventConPayloadJsonCorrecto() throws Exception {
        Map<String, Object> payload = Map.of(
                "reservaId", 123L,
                "propiedadId", 45L,
                "estudianteId", 17L,
                "arrendadorId", 9L,
                "estado", "APROBADA");
        String correlationId = "9a2c8c54-cf2b-4e22-9b8a-aae7c8f08c10";

        publisher.publicar(
                "reserva-events",
                "RESERVA_APROBADA",
                "Reserva",
                "123",
                payload,
                correlationId);

        ArgumentCaptor<OutboxEvent> captor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outboxRepository, times(1)).save(captor.capture());

        OutboxEvent saved = captor.getValue();
        assertThat(saved.getTopic()).isEqualTo("reserva-events");
        assertThat(saved.getEventType()).isEqualTo("RESERVA_APROBADA");
        assertThat(saved.getAggregateType()).isEqualTo("Reserva");
        assertThat(saved.getAggregateId()).isEqualTo("123");
        assertThat(saved.getEventId()).isNotNull();
        assertThat(saved.getPayload()).isNotBlank();

        JsonNode envelope = jsonMapper.readTree(saved.getPayload());
        // Campos obligatorios del envelope (§1 docs/consistencia/00).
        assertThat(envelope.has("eventId")).isTrue();
        assertThat(envelope.get("eventId").asText()).isEqualTo(saved.getEventId().toString());
        assertThat(envelope.get("eventType").asText()).isEqualTo("RESERVA_APROBADA");
        assertThat(envelope.get("eventVersion").asInt()).isEqualTo(1);
        assertThat(envelope.get("source").asText()).isEqualTo("servicio-propiedades");
        assertThat(envelope.get("aggregateType").asText()).isEqualTo("Reserva");
        assertThat(envelope.get("aggregateId").asText()).isEqualTo("123");
        assertThat(envelope.get("correlationId").asText()).isEqualTo(correlationId);
        assertThat(envelope.has("occurredAt")).isTrue();
        assertThat(envelope.get("occurredAt").asText()).isNotBlank();
        assertThat(envelope.has("payload")).isTrue();
        assertThat(envelope.get("payload").get("reservaId").asLong()).isEqualTo(123L);
        assertThat(envelope.get("payload").get("estado").asText()).isEqualTo("APROBADA");
    }

    @Test
    void publicar_payloadNulo_serializaComoObjetoVacio() throws Exception {
        publisher.publicar(
                "propiedades-topic",
                "PROPIEDAD_CREADA",
                "Propiedad",
                "45",
                null,
                null);

        ArgumentCaptor<OutboxEvent> captor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outboxRepository).save(captor.capture());

        JsonNode envelope = jsonMapper.readTree(captor.getValue().getPayload());
        assertThat(envelope.get("payload")).isNotNull();
        assertThat(envelope.get("payload").isObject()).isTrue();
        assertThat(envelope.get("payload").size()).isEqualTo(0);
    }

    @Test
    void publicar_generaEventIdUnicoPorLlamada() {
        publisher.publicar("reserva-events", "RESERVA_APROBADA", "Reserva", "1", Map.of(), null);
        publisher.publicar("reserva-events", "RESERVA_APROBADA", "Reserva", "2", Map.of(), null);

        ArgumentCaptor<OutboxEvent> captor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outboxRepository, times(2)).save(captor.capture());

        UUID id1 = captor.getAllValues().get(0).getEventId();
        UUID id2 = captor.getAllValues().get(1).getEventId();
        assertThat(id1).isNotEqualTo(id2);
    }
}
