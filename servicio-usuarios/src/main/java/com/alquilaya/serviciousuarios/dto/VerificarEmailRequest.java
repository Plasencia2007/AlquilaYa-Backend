package com.alquilaya.serviciousuarios.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Verificación de correo por código de 6 dígitos. */
@Data
public class VerificarEmailRequest {

    @NotBlank(message = "El correo es obligatorio")
    private String correo;

    @NotBlank(message = "El código es obligatorio")
    private String codigo;
}
