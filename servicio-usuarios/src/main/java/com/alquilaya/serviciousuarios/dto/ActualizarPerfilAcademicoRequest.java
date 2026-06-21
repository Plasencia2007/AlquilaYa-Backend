package com.alquilaya.serviciousuarios.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Actualización de datos académicos del estudiante autenticado. {@code ciclo} llega como
 * texto ("1".."12") desde el formulario; el controlador lo valida y convierte a entero.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActualizarPerfilAcademicoRequest {

    @NotBlank(message = "La universidad es obligatoria")
    @Size(max = 150)
    private String universidad;

    @NotBlank(message = "El código de estudiante es obligatorio")
    @Size(max = 50)
    private String codigoEstudiante;

    @NotBlank(message = "La carrera es obligatoria")
    @Size(max = 150)
    private String carrera;

    private String ciclo;
}
