package com.alquilaya.serviciousuarios.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Body de POST /auth/2fa/confirmar (ítem 229): código de 6 dígitos de la app autenticadora. */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Confirmar2faRequest {
    @NotBlank(message = "El código es obligatorio")
    @Pattern(regexp = "^\\d{6}$", message = "El código debe tener exactamente 6 dígitos numéricos")
    private String codigo;
}
