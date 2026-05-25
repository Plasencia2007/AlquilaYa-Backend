package com.alquilaya.serviciopropiedades.saga.entity;

/**
 * Estados del orquestador Saga reserva-pago.
 *
 * <ul>
 *   <li>{@link #INICIADA} — saga recién creada, antes de avanzar a ESPERANDO_PAGO.</li>
 *   <li>{@link #ESPERANDO_PAGO} — reserva aprobada, esperando confirmación de pago.</li>
 *   <li>{@link #COMPENSANDO} — se detectó inconsistencia (refund pendiente, cancelación tras pago, etc.)
 *       y el scheduler reintenta la compensación hasta exitosa o agotar {@code intentos}.</li>
 *   <li>{@link #COMPLETADA} — saga terminó con éxito (pago aplicado o compensación exitosa).</li>
 *   <li>{@link #FALLIDA} — agotó los reintentos, requiere intervención manual.</li>
 * </ul>
 */
public enum EstadoSaga {
    INICIADA,
    ESPERANDO_PAGO,
    COMPENSANDO,
    COMPLETADA,
    FALLIDA
}
