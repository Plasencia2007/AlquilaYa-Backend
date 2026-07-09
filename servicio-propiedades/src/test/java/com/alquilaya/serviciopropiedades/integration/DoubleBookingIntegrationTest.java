package com.alquilaya.serviciopropiedades.integration;

import com.alquilaya.serviciopropiedades.clients.UsuariosClient;
import com.alquilaya.serviciopropiedades.config.CurrentUser;
import com.alquilaya.serviciopropiedades.dto.CrearReservaRequest;
import com.alquilaya.serviciopropiedades.dto.EstudianteInfoDTO;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.kafka.ReservaEventProducer;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import com.alquilaya.serviciopropiedades.services.ReservaService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

/**
 * Prueba de integracion (T1) del guard anti-doble-reserva contra un PostgreSQL REAL
 * (Testcontainers). Ejercita el camino completo de {@link ReservaService#crearSolicitud}:
 * el lock pesimista {@code findByIdForUpdate} (SELECT ... FOR UPDATE) + la consulta de
 * solapamiento de fechas, tal cual corren en produccion sobre Postgres.
 *
 * <p>Se mockean solo los colaboradores EXTERNOS al dominio de reservas:
 * {@link UsuariosClient} (Feign a servicio-usuarios, valida verificacion del estudiante)
 * y {@link ReservaEventProducer} (publicacion Kafka). Repositorios y logica de negocio
 * son los reales.</p>
 *
 * <p>Etiquetada {@code @Tag("integration")}: NO corre en el `mvn test` offline (T3);
 * se ejecuta con {@code mvn test -Pintegration} (requiere Docker).</p>
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class DoubleBookingIntegrationTest {

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
    private ReservaService reservaService;
    @Autowired
    private PropiedadRepository propiedadRepository;
    @Autowired
    private ReservaRepository reservaRepository;

    @MockitoBean
    private UsuariosClient usuariosClient;
    @MockitoBean
    private ReservaEventProducer reservaEventProducer;

    @Test
    void unaSegundaReservaConFechasSolapadasEsRechazada() {
        // --- arrange: propiedad aprobada, disponible, alquiler del inmueble completo ---
        Propiedad propiedad = propiedadRepository.save(Propiedad.builder()
                .titulo("Cuarto de prueba cerca de UPeU")
                .precio(new BigDecimal("450.00"))
                .direccion("Av. Central 123, Nana")
                .arrendadorId(1L)
                .periodoAlquiler("MENSUAL")
                .estado(EstadoPropiedad.APROBADO)
                .aprobadoPorAdmin(true)
                .estaDisponible(true)
                .gestionPorHabitacion(false)
                .build());

        // El estudiante figura como verificado (mock del Feign a servicio-usuarios).
        EstudianteInfoDTO estudianteVerificado = new EstudianteInfoDTO();
        estudianteVerificado.setVerificado(true);
        estudianteVerificado.setNombre("Juan");
        estudianteVerificado.setApellido("Perez");
        when(usuariosClient.obtenerEstudiante(anyLong())).thenReturn(estudianteVerificado);

        CurrentUser estudianteA = CurrentUser.builder().perfilId(10L).rol("ESTUDIANTE").build();
        CurrentUser estudianteB = CurrentUser.builder().perfilId(20L).rol("ESTUDIANTE").build();

        // --- act 1: primera reserva [+5, +35] -> OK, queda SOLICITADA ---
        CrearReservaRequest req1 = new CrearReservaRequest();
        req1.setPropiedadId(propiedad.getId());
        req1.setFechaInicio(LocalDate.now().plusDays(5));
        req1.setFechaFin(LocalDate.now().plusDays(35));
        Reserva primera = reservaService.crearSolicitud(req1, estudianteA);

        assertThat(primera.getId()).isNotNull();
        assertThat(primera.getEstado()).isEqualTo(EstadoReserva.SOLICITADA);

        // --- act 2 + assert: segunda reserva [+10, +40] SOLAPA -> rechazada ---
        CrearReservaRequest req2 = new CrearReservaRequest();
        req2.setPropiedadId(propiedad.getId());
        req2.setFechaInicio(LocalDate.now().plusDays(10));
        req2.setFechaFin(LocalDate.now().plusDays(40));

        assertThatThrownBy(() -> reservaService.crearSolicitud(req2, estudianteB))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("solapa");

        // Solo persiste la primera reserva: no hubo doble-booking.
        assertThat(reservaRepository.count()).isEqualTo(1L);

        // --- control: fechas NO solapadas [+40, +70] -> se permite ---
        CrearReservaRequest req3 = new CrearReservaRequest();
        req3.setPropiedadId(propiedad.getId());
        req3.setFechaInicio(LocalDate.now().plusDays(40));
        req3.setFechaFin(LocalDate.now().plusDays(70));
        Reserva tercera = reservaService.crearSolicitud(req3, estudianteB);

        assertThat(tercera.getId()).isNotNull();
        assertThat(reservaRepository.count()).isEqualTo(2L);
    }
}
