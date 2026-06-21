package com.alquilaya.serviciousuarios.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Cambio de contraseña del usuario autenticado (perfil propio). Coincide con el payload del frontend. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CambiarPasswordPerfilRequest {

    @NotBlank(message = "La contraseña actual es obligatoria")
    private String actual;

    @NotBlank(message = "La nueva contraseña es obligatoria")
    @Size(min = 8, message = "La nueva contraseña debe tener al menos 8 caracteres")
    private String nueva;
}
