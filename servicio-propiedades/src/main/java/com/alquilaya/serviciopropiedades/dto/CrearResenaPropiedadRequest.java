package com.alquilaya.serviciopropiedades.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CrearResenaPropiedadRequest {

    @NotNull(message = "La propiedad es obligatoria")
    private Long propiedadId;

    @NotNull(message = "El rating es obligatorio")
    @Min(value = 1, message = "El rating mínimo es 1")
    @Max(value = 5, message = "El rating máximo es 5")
    private Integer rating;

    @Size(max = 2000, message = "El comentario no puede exceder 2000 caracteres")
    private String comentario;
}
