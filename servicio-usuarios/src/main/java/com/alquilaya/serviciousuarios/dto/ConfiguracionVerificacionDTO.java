package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.enums.MetodoVerificacion;
import jakarta.validation.constraints.NotNull;

/** Método de verificación exigido para iniciar sesión (#3, editable por admin). */
public record ConfiguracionVerificacionDTO(
        @NotNull MetodoVerificacion metodo
) {}
