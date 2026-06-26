package com.alquilaya.serviciousuarios.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Actualización de datos personales del usuario autenticado (perfil propio). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActualizarPerfilPersonalRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(min = 2, max = 50, message = "El nombre debe tener entre 2 y 50 caracteres")
    private String nombre;

    @NotBlank(message = "El apellido es obligatorio")
    @Size(min = 2, max = 50, message = "El apellido debe tener entre 2 y 50 caracteres")
    private String apellido;

    @Size(max = 20, message = "El teléfono no puede superar 20 caracteres")
    private String telefono;

    /** Fecha de nacimiento (ISO yyyy-MM-dd). Opcional. */
    private java.time.LocalDate fechaNacimiento;
}
