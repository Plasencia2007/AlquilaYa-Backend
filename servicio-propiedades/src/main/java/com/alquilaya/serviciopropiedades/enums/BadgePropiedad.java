package com.alquilaya.serviciopropiedades.enums;

/**
 * Distintivos automáticos que se calculan (no se almacenan) a partir del estado
 * de la propiedad y se exponen en los DTOs públicos para que el front pinte chips
 * de urgencia/conversión. Ver {@code BadgeCalculator}.
 */
public enum BadgePropiedad {
    /** Publicada hace poco (dentro de la ventana de "novedad"). */
    NUEVO,
    /** Acumula suficientes vistas para considerarse popular. */
    POPULAR,
    /** Gestión por habitación y queda una sola habitación LIBRE. */
    ULTIMA_PLAZA,
    /** El precio actual es menor que el anterior registrado. */
    REBAJA
}
