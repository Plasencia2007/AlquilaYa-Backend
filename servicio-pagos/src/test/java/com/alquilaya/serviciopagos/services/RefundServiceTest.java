package com.alquilaya.serviciopagos.services;

import com.alquilaya.serviciopagos.entities.Pago;
import com.alquilaya.serviciopagos.outbox.publisher.OutboxPublisher;
import com.alquilaya.serviciopagos.repositories.PagoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Unit tests de {@link RefundService} centrados en la IDEMPOTENCIA y en la marcación
 * de fallos, sin tocar MercadoPago.
 *
 * El happy path PAGADO→REEMBOLSADO no se cubre aquí porque instancia
 * {@code new PaymentRefundClient()} inline (haría una llamada HTTP real, no mockeable).
 * Sí se cubren:
 *   - reserva sin pagos PAGADOS → no-op (re-entrega Kafka at-least-once).
 *   - PAGADO sin paymentId / con paymentId no numérico → REEMBOLSO_FALLIDO + evento
 *     REFUND_FALLIDO, antes de llegar a la llamada a MercadoPago.
 */
@ExtendWith(MockitoExtension.class)
class RefundServiceTest {

    @Mock private PagoRepository pagoRepository;
    @Mock private OutboxPublisher outboxPublisher;

    @InjectMocks
    private RefundService service;

    private static final Long RESERVA = 100L;
    private static final String MOTIVO = "reserva cancelada";
    private static final String CORRELATION = "corr-123";

    private Pago pago(Long id, String estado, String paymentId) {
        return Pago.builder()
                .id(id)
                .reservaId(RESERVA)
                .estado(estado)
                .paymentId(paymentId)
                .monto(new BigDecimal("500"))
                .build();
    }

    @Test
    void reservaSinPagos_esNoOp() {
        when(pagoRepository.findAllByReservaIdOrderByFechaCreacionDesc(RESERVA))
                .thenReturn(List.of());

        service.procesarRefund(RESERVA, MOTIVO, CORRELATION);

        verify(pagoRepository, never()).save(any());
        verifyNoInteractions(outboxPublisher);
    }

    @Test
    void reservaSinPagosPagados_esNoOp() {
        // Re-entrega del evento: los pagos ya quedaron REEMBOLSADO/otros estados.
        when(pagoRepository.findAllByReservaIdOrderByFechaCreacionDesc(RESERVA))
                .thenReturn(List.of(
                        pago(1L, RefundService.ESTADO_REEMBOLSADO, "111"),
                        pago(2L, "PENDIENTE", null)));

        service.procesarRefund(RESERVA, MOTIVO, CORRELATION);

        verify(pagoRepository, never()).save(any());
        verifyNoInteractions(outboxPublisher);
    }

    @Test
    void pagoPagadoSinPaymentId_seMarcaFallido() {
        Pago p = pago(7L, RefundService.ESTADO_PAGADO, null);
        when(pagoRepository.findAllByReservaIdOrderByFechaCreacionDesc(RESERVA))
                .thenReturn(List.of(p));

        service.procesarRefund(RESERVA, MOTIVO, CORRELATION);

        ArgumentCaptor<Pago> guardado = ArgumentCaptor.forClass(Pago.class);
        verify(pagoRepository).save(guardado.capture());
        assertThat(guardado.getValue().getEstado()).isEqualTo(RefundService.ESTADO_REEMBOLSO_FALLIDO);

        verify(outboxPublisher).publicar(
                eq("pagos-topic"), eq("REFUND_FALLIDO"), eq("Pago"),
                eq("7"), any(), eq(CORRELATION));
    }

    @Test
    void pagoPagadoConPaymentIdNoNumerico_seMarcaFallido() {
        Pago p = pago(8L, RefundService.ESTADO_PAGADO, "no-numerico");
        when(pagoRepository.findAllByReservaIdOrderByFechaCreacionDesc(RESERVA))
                .thenReturn(List.of(p));

        service.procesarRefund(RESERVA, MOTIVO, CORRELATION);

        assertThat(p.getEstado()).isEqualTo(RefundService.ESTADO_REEMBOLSO_FALLIDO);
        verify(pagoRepository).save(p);
        verify(outboxPublisher).publicar(
                eq("pagos-topic"), eq("REFUND_FALLIDO"), eq("Pago"),
                eq("8"), any(), eq(CORRELATION));
    }
}
