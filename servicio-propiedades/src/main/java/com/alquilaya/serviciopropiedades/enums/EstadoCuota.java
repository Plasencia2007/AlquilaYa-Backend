package com.alquilaya.serviciopropiedades.enums;

/**
 * Estado de una cuota mensual de renta recurrente (G2).
 *
 * <ul>
 *   <li>{@code PENDIENTE} — generada, aún no vencida ni pagada.</li>
 *   <li>{@code PAGADA} — cobrada (lo marca la integración con servicio-pagos, follow-up).</li>
 *   <li>{@code VENCIDA} — su {@code fechaVencimiento} pasó sin registrarse pago.</li>
 * </ul>
 */
public enum EstadoCuota {
    PENDIENTE,
    PAGADA,
    VENCIDA
}
