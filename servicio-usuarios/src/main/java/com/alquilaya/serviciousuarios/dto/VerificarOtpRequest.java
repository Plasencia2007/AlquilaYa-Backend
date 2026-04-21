package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.validaciones.anotaciones.TelefonoPeruano;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class VerificarOtpRequest {
    @NotBlank(message = "El teléfono es obligatorio para verificar el OTP")
    @TelefonoPeruano
    private String telefono;

    @NotBlank(message = "El código OTP es obligatorio")
    @Pattern(regexp = "^\\d{6}$", message = "El código OTP debe tener exactamente 6 dígitos numéricos")
    private String codigo;
}
