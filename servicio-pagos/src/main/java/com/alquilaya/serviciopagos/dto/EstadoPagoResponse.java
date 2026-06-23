package com.alquilaya.serviciopagos.dto;

import java.math.BigDecimal;

/**
 * Estado del último pago de una reserva, para que el frontend haga polling
 * mientras el usuario completa el pago en Mercado Pago (otra pestaña).
 *
 * @param estado    PENDIENTE, PAGADO, RECHAZADO, PENDIENTE_REVISION, DISCREPANCIA, EXPIRADO o SIN_PAGO
 * @param paymentId id del pago en Mercado Pago (null si aún no hay)
 * @param monto     monto cobrado
 * @param fechaPago fecha de confirmación (ISO-8601) o null
 */
public record EstadoPagoResponse(
        String estado,
        String paymentId,
        BigDecimal monto,
        String fechaPago) {
}
