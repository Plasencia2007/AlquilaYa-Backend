package com.alquilaya.serviciousuarios.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DetallesEstudianteRequest {
    @NotBlank(message = "La universidad es obligatoria")
    private String universidad;

    @NotBlank(message = "El código de estudiante es obligatorio")
    private String codigoEstudiante;

    @NotBlank(message = "La carrera es obligatoria")
    private String carrera;

    @Min(value = 1, message = "El ciclo mínimo es 1")
    @Max(value = 12, message = "El ciclo máximo es 12")
    private Integer ciclo;
}
