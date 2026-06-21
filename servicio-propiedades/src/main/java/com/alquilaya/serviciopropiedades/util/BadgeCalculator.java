package com.alquilaya.serviciopropiedades.util;

import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.enums.BadgePropiedad;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Calcula los {@link BadgePropiedad} de una propiedad a partir de su estado actual.
 * Los badges son DERIVADOS (no se persisten): se recalculan en cada lectura, así
 * siempre reflejan la realidad sin jobs de mantenimiento. Los umbrales viven aquí
 * para tener una única fuente de verdad.
 */
public final class BadgeCalculator {

    private BadgeCalculator() {}

    /** Una propiedad es "nueva" si se publicó dentro de estos días. */
    private static final int NUEVO_DIAS = 10;
    /** Vistas a partir de las cuales se considera "popular". */
    private static final long POPULAR_VISTAS = 50L;
    /** Una rebaja se considera vigente solo dentro de estos días desde que ocurrió. */
    private static final int REBAJA_DIAS = 14;

    /**
     * @param p propiedad
     * @param habitacionesLibres nº de habitaciones LIBRE (solo relevante si la
     *        propiedad es gestionada por habitación); {@code null} si no aplica/no se calculó.
     */
    public static List<BadgePropiedad> calcular(Propiedad p, Long habitacionesLibres) {
        List<BadgePropiedad> badges = new ArrayList<>();
        if (p == null) return badges;

        // NUEVO — recién publicada
        if (p.getFechaCreacion() != null
                && p.getFechaCreacion().isAfter(LocalDateTime.now().minusDays(NUEVO_DIAS))) {
            badges.add(BadgePropiedad.NUEVO);
        }

        // POPULAR — suficientes vistas acumuladas
        if (p.getVistas() != null && p.getVistas() >= POPULAR_VISTAS) {
            badges.add(BadgePropiedad.POPULAR);
        }

        // ULTIMA_PLAZA — gestión por habitación y queda una sola libre
        if (Boolean.TRUE.equals(p.getGestionPorHabitacion())
                && habitacionesLibres != null && habitacionesLibres == 1L) {
            badges.add(BadgePropiedad.ULTIMA_PLAZA);
        }

        // REBAJA — el precio bajó respecto al anterior Y la bajada es reciente (no eterna)
        if (p.getPrecioAnterior() != null && p.getPrecio() != null
                && p.getPrecio().compareTo(p.getPrecioAnterior()) < 0
                && p.getFechaCambioPrecio() != null
                && p.getFechaCambioPrecio().isAfter(LocalDateTime.now().minusDays(REBAJA_DIAS))) {
            badges.add(BadgePropiedad.REBAJA);
        }

        return badges;
    }
}
