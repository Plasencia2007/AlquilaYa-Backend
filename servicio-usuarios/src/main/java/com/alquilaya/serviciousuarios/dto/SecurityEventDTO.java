package com.alquilaya.serviciousuarios.dto;

import java.time.LocalDateTime;

/** Fila del panel admin de alertas de seguridad (ítem 351). */
public record SecurityEventDTO(
        Long id,
        String tipo,
        Long usuarioId,
        String detalle,
        LocalDateTime fecha) {
}
