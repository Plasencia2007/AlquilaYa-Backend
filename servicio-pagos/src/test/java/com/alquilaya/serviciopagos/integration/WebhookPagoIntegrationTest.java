package com.alquilaya.serviciopagos.integration;

import com.alquilaya.serviciopagos.entities.Pago;
import com.alquilaya.serviciopagos.outbox.entity.OutboxEvent;
import com.alquilaya.serviciopagos.outbox.repository.OutboxRepository;
import com.alquilaya.serviciopagos.repositories.PagoRepository;
import com.alquilaya.serviciopagos.services.PagoService;
import com.mercadopago.resources.payment.Payment;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Prueba de integracion (T1) del camino del WEBHOOK de Mercado Pago contra un PostgreSQL
 * REAL (Testcontainers). Ejercita {@link PagoService#aplicarCambioEstado}: la aplicacion
 * del estado del pago a la BD + la escritura del evento en el OUTBOX transaccional
 * ({@code outbox_events}), que es exactamente lo que hace el webhook tras confirmar el
 * pago con Mercado Pago.
 *
 * <p>Se mockea el objeto {@link Payment} (la "verdad" que el webhook re-consulta a MP por
 * HTTP), para no depender de la red ni de credenciales de MP. Los repositorios, la logica
 * de validacion monto/moneda, la persistencia y el outbox son los REALES sobre Postgres.</p>
 *
 * <p>Cubre ademas la IDEMPOTENCIA: reprocesar el mismo pago aprobado no duplica ni el
 * estado ni el evento de outbox.</p>
 *
 * <p>Etiquetada {@code @Tag("integration")}: NO corre en el `mvn test` offline (T3);
 * se ejecuta con {@code mvn test -Pintegration} (requiere Docker).</p>
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class WebhookPagoIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.flyway.enabled", () -> "false");
        registry.add("eureka.client.enabled", () -> "false");
        registry.add("spring.kafka.bootstrap-servers", () -> "localhost:9092");
        registry.add("spring.kafka.listener.auto-startup", () -> "false");
        // Placeholders que normalmente sirve el config-server (aqui deshabilitado).
        registry.add("mercadopago.access-token", () -> "TEST-ACCESS-TOKEN");
        registry.add("mercadopago.back-urls.success", () -> "http://localhost:3000/pago/exito");
        registry.add("mercadopago.back-urls.failure", () -> "http://localhost:3000/pago/fallo");
        registry.add("mercadopago.back-urls.pending", () -> "http://localhost:3000/pago/pendiente");
        registry.add("mercadopago.notification-url", () -> "http://localhost:8084/api/v1/pagos/webhook");
        registry.add("jwt.secret",
                () -> "test-secret-at-least-256-bits-long-for-testing-purposes-only-0123456789");
        registry.add("jwt.expiration", () -> "7200000");
    }

    @Autowired
    private PagoService pagoService;
    @Autowired
    private PagoRepository pagoRepository;
    @Autowired
    private OutboxRepository outboxRepository;

    @Test
    void pagoAprobadoMarcaPagadoYEncolaEventoEnOutbox_yEsIdempotente() {
        // --- arrange: un pago PENDIENTE de la reserva 100, total 455.00 (450 + 5 comision) ---
        Pago pendiente = pagoRepository.save(Pago.builder()
                .reservaId(100L)
                .preferenciaId("PREF-100")
                .estudianteId(10L)
                .monto(new BigDecimal("455.00"))
                .comision(new BigDecimal("5.00"))
                .montoArrendador(new BigDecimal("450.00"))
                .estado("PENDIENTE")
                .build());

        // Payment de MP (mock): aprobado, PEN, monto que coincide, externalReference = reservaId.
        String paymentId = "1234567890";
        Payment payment = mock(Payment.class);
        when(payment.getStatus()).thenReturn("approved");
        when(payment.getExternalReference()).thenReturn("100");
        when(payment.getCurrencyId()).thenReturn("PEN");
        when(payment.getTransactionAmount()).thenReturn(new BigDecimal("455.00"));

        // --- act: aplicar el cambio de estado (nucleo del webhook) ---
        pagoService.aplicarCambioEstado(payment, paymentId);

        // --- assert: el pago quedo PAGADO con su paymentId y fechaPago ---
        Pago actualizado = pagoRepository.findById(pendiente.getId()).orElseThrow();
        assertThat(actualizado.getEstado()).isEqualTo("PAGADO");
        assertThat(actualizado.getPaymentId()).isEqualTo(paymentId);
        assertThat(actualizado.getFechaPago()).isNotNull();

        // --- assert: se escribio EXACTAMENTE un evento PAGO_EXITOSO en el outbox ---
        List<OutboxEvent> exitosos = outboxRepository.findAll().stream()
                .filter(e -> "PAGO_EXITOSO".equals(e.getEventType()))
                .toList();
        assertThat(exitosos).hasSize(1);
        assertThat(exitosos.get(0).getAggregateId()).isEqualTo(actualizado.getId().toString());
        assertThat(exitosos.get(0).getTopic()).isEqualTo("pagos-topic");

        // --- idempotencia: reprocesar el MISMO pago aprobado no duplica nada ---
        pagoService.aplicarCambioEstado(payment, paymentId);

        assertThat(pagoRepository.findById(pendiente.getId()).orElseThrow().getEstado())
                .isEqualTo("PAGADO");
        long eventosPagoExitoso = outboxRepository.findAll().stream()
                .filter(e -> "PAGO_EXITOSO".equals(e.getEventType()))
                .count();
        assertThat(eventosPagoExitoso).isEqualTo(1L);
    }
}
