package com.alquilaya.serviciousuarios.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LoginRequest {
    @NotBlank(message = "El correo es obligatorio para iniciar sesión")
    @Email(message = "El formato de correo no es válido (ejemplo: usuario@correo.com)")
    private String correo;

    @NotBlank(message = "La contraseña es obligatoria")
    private String password;
}
