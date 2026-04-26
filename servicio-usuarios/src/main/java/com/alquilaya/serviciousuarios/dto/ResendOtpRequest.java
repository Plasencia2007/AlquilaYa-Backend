package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.validaciones.anotaciones.TelefonoPeruano;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResendOtpRequest {

    @NotBlank(message = "El teléfono es obligatorio")
    @TelefonoPeruano
    private String telefono;
}
