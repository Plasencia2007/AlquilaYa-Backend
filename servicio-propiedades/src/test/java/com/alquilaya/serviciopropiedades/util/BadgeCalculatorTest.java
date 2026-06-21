package com.alquilaya.serviciopropiedades.util;

import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.enums.BadgePropiedad;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Cubre los umbrales de {@link BadgeCalculator}: cada badge se enciende/apaga según
 * el estado de la propiedad, incluida la EXPIRACIÓN de la rebaja.
 */
class BadgeCalculatorTest {

    private Propiedad base() {
        Propiedad p = new Propiedad();
        p.setPrecio(new BigDecimal("500"));
        p.setFechaCreacion(LocalDateTime.now().minusMonths(6)); // no nuevo
        p.setVistas(0L);                                        // no popular
        p.setGestionPorHabitacion(false);
        return p;
    }

    @Test
    void propiedadNulaDevuelveListaVacia() {
        assertThat(BadgeCalculator.calcular(null, null)).isEmpty();
    }

    @Test
    void propiedadBaseSinSenalesNoTieneBadges() {
        assertThat(BadgeCalculator.calcular(base(), null)).isEmpty();
    }

    @Test
    void nuevoCuandoFechaCreacionReciente() {
        Propiedad p = base();
        p.setFechaCreacion(LocalDateTime.now().minusDays(3));
        assertThat(BadgeCalculator.calcular(p, null)).contains(BadgePropiedad.NUEVO);
    }

    @Test
    void noNuevoCuandoFechaCreacionAntigua() {
        Propiedad p = base();
        p.setFechaCreacion(LocalDateTime.now().minusDays(40));
        assertThat(BadgeCalculator.calcular(p, null)).doesNotContain(BadgePropiedad.NUEVO);
    }

    @Test
    void popularCuandoSuperaUmbralDeVistas() {
        Propiedad p = base();
        p.setVistas(120L);
        assertThat(BadgeCalculator.calcular(p, null)).contains(BadgePropiedad.POPULAR);
    }

    @Test
    void noPopularPorDebajoDelUmbral() {
        Propiedad p = base();
        p.setVistas(10L);
        assertThat(BadgeCalculator.calcular(p, null)).doesNotContain(BadgePropiedad.POPULAR);
    }

    @Test
    void ultimaPlazaSoloConGestionPorHabitacionYUnaLibre() {
        Propiedad p = base();
        p.setGestionPorHabitacion(true);
        assertThat(BadgeCalculator.calcular(p, 1L)).contains(BadgePropiedad.ULTIMA_PLAZA);
    }

    @Test
    void noUltimaPlazaConMasDeUnaLibre() {
        Propiedad p = base();
        p.setGestionPorHabitacion(true);
        assertThat(BadgeCalculator.calcular(p, 3L)).doesNotContain(BadgePropiedad.ULTIMA_PLAZA);
    }

    @Test
    void noUltimaPlazaSiNoSeGestionaPorHabitacion() {
        Propiedad p = base();
        p.setGestionPorHabitacion(false);
        assertThat(BadgeCalculator.calcular(p, 1L)).doesNotContain(BadgePropiedad.ULTIMA_PLAZA);
    }

    @Test
    void rebajaCuandoPrecioBajoRecientemente() {
        Propiedad p = base();
        p.setPrecio(new BigDecimal("450"));
        p.setPrecioAnterior(new BigDecimal("500"));
        p.setFechaCambioPrecio(LocalDateTime.now().minusDays(2));
        assertThat(BadgeCalculator.calcular(p, null)).contains(BadgePropiedad.REBAJA);
    }

    @Test
    void rebajaExpiraPasadaLaVentana() {
        Propiedad p = base();
        p.setPrecio(new BigDecimal("450"));
        p.setPrecioAnterior(new BigDecimal("500"));
        p.setFechaCambioPrecio(LocalDateTime.now().minusDays(30)); // fuera de la ventana
        assertThat(BadgeCalculator.calcular(p, null)).doesNotContain(BadgePropiedad.REBAJA);
    }

    @Test
    void sinRebajaSiElPrecioNoBajo() {
        Propiedad p = base();
        p.setPrecio(new BigDecimal("600"));
        p.setPrecioAnterior(new BigDecimal("500"));
        p.setFechaCambioPrecio(LocalDateTime.now().minusDays(1));
        assertThat(BadgeCalculator.calcular(p, null)).doesNotContain(BadgePropiedad.REBAJA);
    }

    @Test
    void variosBadgesSeAcumulan() {
        Propiedad p = base();
        p.setFechaCreacion(LocalDateTime.now().minusDays(1)); // NUEVO
        p.setVistas(80L);                                     // POPULAR
        p.setGestionPorHabitacion(true);
        p.setPrecio(new BigDecimal("450"));
        p.setPrecioAnterior(new BigDecimal("500"));
        p.setFechaCambioPrecio(LocalDateTime.now().minusDays(1)); // REBAJA
        assertThat(BadgeCalculator.calcular(p, 1L)).containsExactlyInAnyOrder(
                BadgePropiedad.NUEVO,
                BadgePropiedad.POPULAR,
                BadgePropiedad.ULTIMA_PLAZA,
                BadgePropiedad.REBAJA);
    }
}
