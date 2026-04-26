package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.enums.Rol;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GoogleLoginRequest {

    @NotBlank(message = "El token de Google es obligatorio")
    private String idToken;

    /**
     * Rol preferido para la creación si el usuario no existe.
     * Si el usuario YA existe, este campo se ignora (login se hace con el rol existente).
     * Default ESTUDIANTE si no viene.
     */
    private Rol rolPreferido;
}
