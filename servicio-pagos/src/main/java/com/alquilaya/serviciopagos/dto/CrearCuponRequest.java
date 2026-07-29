package com.alquilaya.serviciopagos.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Ítem 292: alta de cupón, solo ADMIN. */
public record CrearCuponRequest(
        String codigo,
        String tipoDescuento,
        BigDecimal valor,
        LocalDateTime fechaInicio,
        LocalDateTime fechaFin,
        Integer usosMaximos,
        BigDecimal montoMinimo) {
}
