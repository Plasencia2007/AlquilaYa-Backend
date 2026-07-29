package com.alquilaya.serviciopagos.dto;

import java.math.BigDecimal;

/**
 * Ítem 292: resultado de validar un cupón para una reserva concreta. {@code montoDescuento} y
 * {@code comisionFinal} son el MISMO cálculo que aplicará {@code crearPreferencia} si el
 * estudiante confirma el pago con este código — no un estimado aparte.
 */
public record ValidarCuponResponse(
        boolean valido,
        String mensaje,
        BigDecimal montoDescuento,
        BigDecimal comisionFinal,
        BigDecimal totalConDescuento) {
}
