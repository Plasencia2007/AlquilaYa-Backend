package com.alquilaya.serviciousuarios.enums;

/**
 * Nivel de reputación derivado del score agregado (0–100). Umbrales pensados para que
 * un perfil recién creado sin reseñas empiece en BRONCE y se gane PLATINO con buena
 * actividad + reseñas + verificación completa.
 */
public enum NivelReputacion {
    BRONCE,
    PLATA,
    ORO,
    PLATINO;

    public static NivelReputacion fromScore(int score) {
        if (score >= 85) return PLATINO;
        if (score >= 65) return ORO;
        if (score >= 40) return PLATA;
        return BRONCE;
    }
}
