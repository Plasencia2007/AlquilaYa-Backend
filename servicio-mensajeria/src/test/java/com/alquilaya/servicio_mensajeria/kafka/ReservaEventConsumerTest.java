package com.alquilaya.servicio_mensajeria.kafka;

import com.alquilaya.servicio_mensajeria.clients.UsuariosClient;
import com.alquilaya.servicio_mensajeria.dto.UsuarioPerfilDTO;
import com.alquilaya.servicio_mensajeria.enums.TipoNotificacion;
import com.alquilaya.servicio_mensajeria.kafka.idempotency.service.IdempotencyService;
import com.alquilaya.servicio_mensajeria.services.NotificacionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests unitarios de {@link ReservaEventConsumer}.
 *
 * Cubre la matriz de la Ola 2:
 *   - Envelope RESERVA_APROBADA  → notifica al estudiante con TipoNotificacion.RESERVA_APROBADA.
 *   - Legacy {"tipo":"RESERVA_APROBADA"} → también funciona (bug-fix de Ola 2).
 *   - eventId duplicado          → idempotencyService devuelve false → consumer NO procesa.
 *   - eventType desconocido      → no notifica.
 */
@ExtendWith(MockitoExtension.class)
class ReservaEventConsumerTest {

    @Mock
    private NotificacionService notificacionService;

    @Mock
    private UsuariosClient usuariosClient;

    @Mock
    private IdempotencyService idempotencyService;

    @InjectMocks
    private ReservaEventConsumer consumer;

    private static String envelopeReservaAprobada(UUID eventId, long reservaId, long estudianteId) {
        return """
                {
                  "eventId":      "%s",
                  "eventType":    "RESERVA_APROBADA",
                  "eventVersion": 1,
                  "occurredAt":   "2026-05-25T10:32:11Z",
                  "source":       "servicio-propiedades",
                  "aggregateType":"Reserva",
                  "aggregateId":  "%d",
                  "payload": {
                    "reservaId":    %d,
                    "propiedadId":  45,
                    "estudianteId": %d,
                    "arrendadorId": 9,
                    "estado":       "APROBADA",
                    "montoTotal":   600.00
                  }
                }
                """.formatted(eventId, reservaId, reservaId, estudianteId);
    }

    private static UsuarioPerfilDTO perfilConUserId(Long userId) {
        UsuarioPerfilDTO dto = new UsuarioPerfilDTO();
        dto.setUsuarioId(userId);
        return dto;
    }

    @Test
    void envelopeReservaAprobada_notificaEstudianteConTipoCorrecto() {
        UUID eventId = UUID.randomUUID();
        when(idempotencyService.marcarComoProcesado(eq(eventId), anyString())).thenReturn(true);
        when(usuariosClient.obtenerEstudiante(17L)).thenReturn(perfilConUserId(41L));

        consumer.escuchar(envelopeReservaAprobada(eventId, 123L, 17L));

        ArgumentCaptor<TipoNotificacion> tipoCaptor = ArgumentCaptor.forClass(TipoNotificacion.class);
        ArgumentCaptor<Long> userIdCaptor = ArgumentCaptor.forClass(Long.class);
        verify(notificacionService, times(1)).crear(
                userIdCaptor.capture(),
                tipoCaptor.capture(),
                anyString(),
                anyString(),
                anyString(),
                any(),
                anyBoolean());
        assertThat(tipoCaptor.getValue()).isEqualTo(TipoNotificacion.RESERVA_APROBADA);
        assertThat(userIdCaptor.getValue()).isEqualTo(41L);
    }

    @Test
    void legacyJsonReservaAprobada_tambienNotifica_bugFixOla2() {
        // Productor legacy emitía {"tipo":"RESERVA_APROBADA", ...}. El consumer
        // antes matcheaba contra "APROBADA" y nunca disparaba — Ola 2 corrige.
        String legacy = """
                {
                  "tipo":         "RESERVA_APROBADA",
                  "reservaId":    123,
                  "propiedadId":  45,
                  "estudianteId": 17,
                  "arrendadorId": 9,
                  "estado":       "APROBADA"
                }
                """;
        when(usuariosClient.obtenerEstudiante(17L)).thenReturn(perfilConUserId(41L));

        consumer.escuchar(legacy);

        verify(notificacionService, times(1)).crear(
                eq(41L),
                eq(TipoNotificacion.RESERVA_APROBADA),
                anyString(), anyString(), anyString(), any(), anyBoolean());
        // En ruta legacy NO se llama a idempotencyService.
        verify(idempotencyService, never()).marcarComoProcesado(any(), anyString());
    }

    @Test
    void eventIdDuplicado_idempotencyServiceFalse_returnInmediatoSinProcesar() {
        UUID eventId = UUID.randomUUID();
        when(idempotencyService.marcarComoProcesado(eq(eventId), anyString())).thenReturn(false);

        consumer.escuchar(envelopeReservaAprobada(eventId, 123L, 17L));

        verify(notificacionService, never()).crear(
                any(), any(), anyString(), anyString(), anyString(), any(), anyBoolean());
        verify(usuariosClient, never()).obtenerEstudiante(any());
        verify(usuariosClient, never()).obtenerArrendador(any());
    }

    @Test
    void envelopeEventTypeDesconocido_noNotifica() {
        UUID eventId = UUID.randomUUID();
        String raw = """
                {
                  "eventId":   "%s",
                  "eventType": "RESERVA_LO_QUE_SEA",
                  "payload":   {"reservaId": 1, "estudianteId": 17, "arrendadorId": 9}
                }
                """.formatted(eventId);
        when(idempotencyService.marcarComoProcesado(eq(eventId), anyString())).thenReturn(true);

        consumer.escuchar(raw);

        verify(notificacionService, never()).crear(
                any(), any(), anyString(), anyString(), anyString(), any(), anyBoolean());
    }
}
