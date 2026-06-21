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

    // --- Sub-categorías (1-5). Opcionales: si vienen, se guardan y el front arma el rating general como su promedio. ---
    @Min(1) @Max(5) private Integer ratingLimpieza;
    @Min(1) @Max(5) private Integer ratingUbicacion;
    @Min(1) @Max(5) private Integer ratingPrecio;
    @Min(1) @Max(5) private Integer ratingTrato;

    @Size(max = 2000, message = "El comentario no puede exceder 2000 caracteres")
    private String comentario;
}
