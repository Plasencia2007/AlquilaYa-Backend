package com.alquilaya.serviciousuarios.dto;

/** Una sesión/dispositivo activo del usuario (#10). */
public record SesionDTO(
        String jti,
        String dispositivo,
        String ip,
        Long creado,   // epoch millis
        boolean actual // true si es la sesión desde la que se hace la consulta
) {}
