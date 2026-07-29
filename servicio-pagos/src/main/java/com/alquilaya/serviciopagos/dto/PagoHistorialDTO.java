package com.alquilaya.serviciopagos.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Ítem 279: fila del historial de pagos del estudiante autenticado.
 *
 * @param propiedadTitulo resuelto vía Feign a servicio-propiedades; null si no se pudo resolver
 *                         (el pago sigue siendo útil sin el título).
 */
public record PagoHistorialDTO(
        Long id,
        Long reservaId,
        BigDecimal monto,
        BigDecimal comision,
        String estado,
        LocalDateTime fechaPago,
        LocalDateTime fechaCreacion,
        String propiedadTitulo) {
}
