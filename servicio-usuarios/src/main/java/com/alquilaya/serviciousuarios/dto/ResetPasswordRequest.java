package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.validaciones.anotaciones.ContrasenaSegura;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResetPasswordRequest {

    @NotBlank(message = "El token es obligatorio")
    private String token;

    @NotBlank(message = "La contraseña es obligatoria")
    @ContrasenaSegura
    private String nuevaPassword;
}
