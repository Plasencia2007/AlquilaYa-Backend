package com.alquilaya.serviciopropiedades.saga.entity;

/**
 * Paso actual dentro del flujo de la saga reserva-pago.
 *
 * Diagrama feliz:
 *  PAGO_PENDIENTE → PAGO_CONFIRMADO → FIN
 *
 * Diagrama compensatorio:
 *  PAGO_PENDIENTE → COMPENSACION_REFUND → COMPENSACION_NOTIFICAR → FIN
 */
public enum PasoSaga {
    PAGO_PENDIENTE,
    PAGO_CONFIRMADO,
    COMPENSACION_REFUND,
    COMPENSACION_NOTIFICAR,
    FIN
}
