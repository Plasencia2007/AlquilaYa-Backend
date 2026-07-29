package com.alquilaya.serviciopagos.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Ítem 318: fila del historial de pagos PAGADOs del arrendador autenticado, con la
 * {@code fechaPago} REAL de la entidad {@link com.alquilaya.serviciopagos.entities.Pago} (a
 * diferencia de {@code fechaInicio}/{@code fechaCreacion} de la Reserva, que es lo único que
 * tenía el frontend hasta ahora para agrupar sus ingresos por mes).
 *
 * <p>Hermano de {@link PagoHistorialDTO} (ítem 279, vista del estudiante): misma forma general
 * pero agrega {@code montoArrendador} (lo que el arrendador realmente recibe, sin la comisión de
 * plataforma) porque este historial es para el arrendador, no el pagador.
 *
 * @param propiedadTitulo resuelto vía Feign a servicio-propiedades; null si no se pudo resolver
 *                         (el pago sigue siendo útil sin el título).
 * @param propiedadId ítem 344: id de la propiedad (mismo Feign que resuelve {@code propiedadTitulo}),
 *                     para que el frontend pueda filtrar por id en vez de matchear por título — el
 *                     selector global de propiedad del panel arrendador lo necesita para cruzar con
 *                     el resto de páginas (reservas, finanzas por cuarto), que ya usan id. Null en el
 *                     mismo caso que {@code propiedadTitulo} (Feign no resuelto).
 */
public record PagoArrendadorHistorialDTO(
        Long id,
        Long reservaId,
        BigDecimal monto,
        BigDecimal comision,
        BigDecimal montoArrendador,
        String estado,
        LocalDateTime fechaPago,
        LocalDateTime fechaCreacion,
        String propiedadTitulo,
        Long propiedadId) {
}
