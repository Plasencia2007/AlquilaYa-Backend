package com.alquilaya.serviciopropiedades.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Calcula el monto de una reserva a partir del precio mensual de la propiedad/habitación y el
 * rango de fechas. Única fuente de verdad: antes esta fórmula estaba duplicada en
 * {@code ReservaService} y {@code GrupoRoommateService}.
 *
 * <p>El precio se trata como MENSUAL — toda la UI lo asume así (ficha "/mes", y el formulario
 * cobra precio × meses). Cobramos por MESES COMPLETOS para que coincida exactamente con lo que
 * muestra el formulario: "1 mes = 1 × precio" (sin prorrateo por día, que daba totales raros
 * como S/1.03 o, con el divisor por período, S/0.17).
 */
public final class CalculoMontoReserva {

    private CalculoMontoReserva() {}

    /**
     * @param precioMensual precio mensual de la propiedad/habitación
     * @param fechaInicio primer día de la estadía (inclusive)
     * @param fechaFin último día de la estadía (inclusive)
     * @return precioMensual × meses completos, redondeado a 2 decimales (HALF_UP)
     */
    public static BigDecimal calcular(BigDecimal precioMensual, LocalDate fechaInicio, LocalDate fechaFin) {
        long dias = ChronoUnit.DAYS.between(fechaInicio, fechaFin) + 1;
        // El formulario fija la duración en meses (fechaFin = fechaInicio + N meses); reconstruimos N.
        long meses = Math.max(1, Math.round(dias / 30.0));
        return precioMensual.multiply(BigDecimal.valueOf(meses)).setScale(2, RoundingMode.HALF_UP);
    }
}
