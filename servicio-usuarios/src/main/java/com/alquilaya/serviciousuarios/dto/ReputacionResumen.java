package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.enums.NivelReputacion;

/**
 * Score agregado de reputación (#26): un único número 0–100 + su nivel,
 * derivado de varias señales (reseñas, verificaciones, antigüedad, actividad).
 */
public record ReputacionResumen(int score, NivelReputacion nivel) {
}
