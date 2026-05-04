package com.alquilaya.serviciousuarios.dto;

import java.time.LocalDateTime;

public record AdminArrendadorDTO(
        Long id,
        String nombre,
        String apellido,
        String correo,
        String dni,
        String telefono,
        boolean telefonoVerificado,
        String fotoUrl,
        String estado,
        LocalDateTime fechaCreacion,
        Double calificacion,
        String nombreComercial,
        Long perfilArrendadorId
) {}
