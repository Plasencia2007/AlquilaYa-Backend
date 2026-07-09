package com.alquilaya.serviciopropiedades.integration;

import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.outbox.entity.OutboxEvent;
import com.alquilaya.serviciopropiedades.outbox.envelope.EventEnvelope;
import com.alquilaya.serviciopropiedades.outbox.envelope.EventEnvelopeBuilder;
import com.alquilaya.serviciopropiedades.outbox.repository.OutboxRepository;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import com.alquilaya.serviciopropiedades.saga.entity.EstadoSaga;
import com.alquilaya.serviciopropiedades.saga.entity.PasoSaga;
import com.alquilaya.serviciopropiedades.saga.entity.SagaReservaPago;
import com.alquilaya.serviciopropiedades.saga.repository.SagaReservaPagoRepository;
import com.alquilaya.serviciopropiedades.saga.service.SagaReservaPagoService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Prueba de integracion (T1) de la Saga reserva-pago
 * ({@link SagaReservaPagoService}) contra un PostgreSQL REAL (Testcontainers).
 *
 * <p>Cubre el escenario "pago tardio tras expiracion" (P4): una reserva se
 * APRUEBA (arranca la saga en ESPERANDO_PAGO/PAGO_PENDIENTE), expira antes de
 * pagarse (el scheduler la pasa a EXPIRADA y cierra la saga original como
 * COMPLETADA/FIN sin nada que reembolsar), y DESPUES llega el evento
 * {@code PAGO_EXITOSO} (reintento/entrega tardia de Kafka). Como la saga
 * original ya esta en estado terminal, {@link SagaReservaPagoService} debe
 * detectar que la reserva quedo EXPIRADA y disparar la compensacion: crea una
 * saga "huerfana" y emite {@code REFUND_REQUERIDO} al outbox transaccional
 * (ver {@link SagaReservaPagoService#manejarPagoExitoso} y su rama
 * {@code aplicarLogicaDirecta}), en vez de perder el dinero cobrado o
 * reabrir la saga ya cerrada.</p>
 *
 * <p>Se ejercitan directamente los metodos del servicio de la saga (no hace
 * falta un broker Kafka real): {@link SagaReservaPagoService#iniciarSaga},
 * {@link SagaReservaPagoService#manejarExpiracionReserva} y
 * {@link SagaReservaPagoService#manejarPagoExitoso}, tal cual los invocan
 * {@code ReservaExpirationScheduler} y {@code PagoEventListener} en
 * produccion. Repositorios y logica de negocio son los reales sobre Postgres.</p>
 *
 * <p>Etiquetada {@code @Tag("integration")}: NO corre en el `mvn test` offline (T3);
 * se ejecuta con {@code mvn test -Pintegration} (requiere Docker).</p>
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class SagaPagoTardioTrasExpiracionIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void datasourceProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        // Hibernate crea el esquema real desde las entidades (Postgres soporta jsonb/TEXT/etc.).
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.flyway.enabled", () -> "false");
        // Sin infra externa en el test.
        registry.add("eureka.client.enabled", () -> "false");
        registry.add("spring.kafka.bootstrap-servers", () -> "localhost:9092");
        registry.add("spring.kafka.listener.auto-startup", () -> "false");
        registry.add("spring.cache.type", () -> "none");
        // Sin seeders de datos de ejemplo (evita que el CommandLineRunner golpee Feign/catalogos).
        registry.add("alquilaya.seed.enabled", () -> "false");
        // Placeholders que normalmente sirve el config-server (aqui deshabilitado).
        registry.add("jwt.secret",
                () -> "test-secret-at-least-256-bits-long-for-testing-purposes-only-0123456789");
        registry.add("jwt.expiration", () -> "7200000");
        registry.add("cloudinary.cloud-name", () -> "test");
        registry.add("cloudinary.api-key", () -> "test");
        registry.add("cloudinary.api-secret", () -> "test");
    }

    @Autowired
    private SagaReservaPagoService sagaService;
    @Autowired
    private ReservaRepository reservaRepository;
    @Autowired
    private SagaReservaPagoRepository sagaRepository;
    @Autowired
    private OutboxRepository outboxRepository;

    private static final ObjectMapper JSON = new ObjectMapper();

    @Test
    void pagoTardioSobreReservaExpiradaDisparaCompensacionYRefund() throws Exception {
        // --- arrange: reserva APROBADA (arrendador ya la acepto, esperando pago) ---
        Reserva reserva = reservaRepository.save(Reserva.builder()
                .propiedadId(999L)
                .estudianteId(10L)
                .arrendadorId(1L)
                .fechaInicio(LocalDate.now().plusDays(5))
                .fechaFin(LocalDate.now().plusDays(35))
                .montoTotal(new BigDecimal("450.00"))
                .estado(EstadoReserva.APROBADA)
                .build());
        Long reservaId = reserva.getId();

        // --- act 1: se aprueba -> arranca la saga (ESPERANDO_PAGO / PAGO_PENDIENTE) ---
        SagaReservaPago sagaOriginal = sagaService.iniciarSaga(reservaId);
        assertThat(sagaOriginal.getEstadoSaga()).isEqualTo(EstadoSaga.ESPERANDO_PAGO);
        assertThat(sagaOriginal.getPasoActual()).isEqualTo(PasoSaga.PAGO_PENDIENTE);

        // --- act 2: la reserva EXPIRA antes de pagarse (equivalente a lo que hace
        // ReservaExpirationScheduler.ReservaExpirationService#expirarUna: pasa la reserva
        // a EXPIRADA y cierra la saga vigente) ---
        reserva.setEstado(EstadoReserva.EXPIRADA);
        reservaRepository.save(reserva);
        sagaService.manejarExpiracionReserva(reservaId);

        SagaReservaPago sagaTrasExpirar = sagaRepository.findById(sagaOriginal.getSagaId()).orElseThrow();
        assertThat(sagaTrasExpirar.getEstadoSaga()).isEqualTo(EstadoSaga.COMPLETADA);
        assertThat(sagaTrasExpirar.getPasoActual()).isEqualTo(PasoSaga.FIN);
        assertThat(sagaTrasExpirar.getCompletedAt()).isNotNull();
        // Sin pago aun -> no se emitio ningun REFUND_REQUERIDO al cerrar por expiracion.
        assertThat(outboxRepository.findAll()).isEmpty();

        // --- act 3: llega TARDE el evento PAGO_EXITOSO (reintento/entrega tardia de Kafka)
        // sobre una reserva que ya esta EXPIRADA y cuya saga original ya cerro ---
        EventEnvelope envelopePagoTardio = EventEnvelopeBuilder.builder()
                .eventType("PAGO_EXITOSO")
                .source("servicio-pagos")
                .aggregateType("Reserva")
                .aggregateId(String.valueOf(reservaId))
                .correlationId("corr-pago-tardio-1")
                .payload(Map.of("pagoId", 555L, "paymentId", "MP-999", "monto", "450.00"))
                .build();

        sagaService.manejarPagoExitoso(reservaId, envelopePagoTardio);

        // --- assert: la reserva SIGUE EXPIRADA (el pago tardio no la reabre ni la marca PAGADA) ---
        Reserva reservaFinal = reservaRepository.findById(reservaId).orElseThrow();
        assertThat(reservaFinal.getEstado()).isEqualTo(EstadoReserva.EXPIRADA);

        // --- assert: se creo una saga NUEVA ("huerfana") ademas de la original, ya COMPLETADA ---
        List<SagaReservaPago> sagasDeLaReserva =
                sagaRepository.findByReservaIdOrderByCreatedAtDesc(reservaId);
        assertThat(sagasDeLaReserva).hasSize(2);

        SagaReservaPago sagaHuerfana = sagasDeLaReserva.get(0); // la mas reciente
        assertThat(sagaHuerfana.getSagaId()).isNotEqualTo(sagaOriginal.getSagaId());
        assertThat(sagaHuerfana.getEstadoSaga()).isEqualTo(EstadoSaga.COMPLETADA);
        assertThat(sagaHuerfana.getPasoActual()).isEqualTo(PasoSaga.FIN);
        assertThat(sagaHuerfana.getCompletedAt()).isNotNull();
        assertThat(sagaHuerfana.getUltimoError()).isNull();
        JsonNode payloadHuerfana = JSON.readTree(sagaHuerfana.getPayload());
        assertThat(payloadHuerfana.get("razon").asText()).isEqualTo("saga_huerfana_pago_post_cancel");

        // --- assert: se emitio EXACTAMENTE un REFUND_REQUERIDO al outbox transaccional,
        // con el reservaId/pagoId/motivo/sagaId correctos ---
        List<OutboxEvent> refunds = outboxRepository.findAll().stream()
                .filter(e -> "REFUND_REQUERIDO".equals(e.getEventType()))
                .toList();
        assertThat(refunds).hasSize(1);

        OutboxEvent refund = refunds.get(0);
        assertThat(refund.getTopic()).isEqualTo("pagos-topic");
        assertThat(refund.getAggregateType()).isEqualTo("Reserva");
        assertThat(refund.getAggregateId()).isEqualTo(reservaId.toString());
        assertThat(refund.getSentAt()).isNull(); // aun no lo publico el OutboxScheduler

        JsonNode envelopeNode = JSON.readTree(refund.getPayload());
        assertThat(envelopeNode.get("eventType").asText()).isEqualTo("REFUND_REQUERIDO");
        JsonNode datosRefund = envelopeNode.get("payload");
        assertThat(datosRefund.get("reservaId").asLong()).isEqualTo(reservaId);
        assertThat(datosRefund.get("pagoId").asLong()).isEqualTo(555L);
        assertThat(datosRefund.get("motivo").asText()).contains("EXPIRADA");
        assertThat(datosRefund.get("sagaId").asText()).isEqualTo(sagaHuerfana.getSagaId().toString());
    }
}
