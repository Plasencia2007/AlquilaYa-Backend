package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.config.CurrentUser;
import com.alquilaya.serviciopropiedades.dto.ActividadDTO;
import com.alquilaya.serviciopropiedades.dto.DashboardArrendadorDTO;
import com.alquilaya.serviciopropiedades.dto.IngresoMensualDTO;
import com.alquilaya.serviciopropiedades.services.DashboardService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardControllerTest {

    @Mock
    private DashboardService dashboardService;

    @InjectMocks
    private DashboardController dashboardController;

    @BeforeEach
    void setUp() {
        CurrentUser current = CurrentUser.builder()
                .userId(10L)
                .perfilId(42L)
                .email("arr@test.com")
                .rol("ARRENDADOR")
                .build();
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                current,
                "token",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_ARRENDADOR")));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void obtenerDashboardArrendador_devuelve200ConMetricas() {
        DashboardArrendadorDTO mock = DashboardArrendadorDTO.builder()
                .ingresosMesActual(new BigDecimal("1000.00"))
                .ingresosMesAnterior(new BigDecimal("800.00"))
                .tasaOcupacion(50.0)
                .totalPropiedades(2L)
                .propiedadesActivas(2L)
                .vistasUltimos30Dias(0L)
                .mensajesSinLeer(3L)
                .reservasPendientes(1L)
                .reservasActivas(1L)
                .actividadReciente(List.of(ActividadDTO.builder()
                        .tipo("RESERVA_NUEVA")
                        .descripcion("Nueva reserva")
                        .fecha(LocalDateTime.now())
                        .referenciaId("1")
                        .build()))
                .ingresosPorMes(List.of(IngresoMensualDTO.builder()
                        .mes("2026-04")
                        .monto(new BigDecimal("1000.00"))
                        .build()))
                .build();

        when(dashboardService.obtenerMetricasArrendador(eq(42L))).thenReturn(mock);

        ResponseEntity<DashboardArrendadorDTO> response = dashboardController.obtenerDashboardArrendador();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getIngresosMesActual()).isEqualByComparingTo("1000.00");
        assertThat(response.getBody().getMensajesSinLeer()).isEqualTo(3L);
        assertThat(response.getBody().getActividadReciente()).hasSize(1);
        verify(dashboardService).obtenerMetricasArrendador(42L);
    }
}
