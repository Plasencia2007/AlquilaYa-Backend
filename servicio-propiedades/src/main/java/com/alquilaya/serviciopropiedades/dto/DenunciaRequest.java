package com.alquilaya.serviciopropiedades.dto;

import com.alquilaya.serviciopropiedades.enums.MotivoDenuncia;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Cuerpo para crear una denuncia de publicación. */
public record DenunciaRequest(
        @NotNull MotivoDenuncia motivo,
        @Size(max = 1000) String descripcion
) {}
