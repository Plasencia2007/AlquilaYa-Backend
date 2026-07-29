package com.alquilaya.serviciousuarios.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Body de POST /auth/2fa/deshabilitar (ítem 229). Requiere AL MENOS UNO de los dos (password
 * actual o código TOTP vigente) — validado en el controller, no aquí, para poder dar un
 * mensaje de error único cuando ninguno es válido.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Deshabilitar2faRequest {
    private String password;
    private String codigo;
}
