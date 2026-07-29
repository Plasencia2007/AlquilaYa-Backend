package com.alquilaya.serviciousuarios.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Segundo paso del login cuando el usuario tiene 2FA activo (ítem 229): completa la sesión
 * con el código TOTP tras un /login que respondió {@code autenticado=false, requiere2fa=true}.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LoginVerificarTotpRequest {
    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Correo inválido")
    private String correo;

    @NotBlank(message = "El código es obligatorio")
    @Pattern(regexp = "^\\d{6}$", message = "El código debe tener exactamente 6 dígitos numéricos")
    private String codigo;
}
