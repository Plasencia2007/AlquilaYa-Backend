package com.alquilaya.serviciopropiedades.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Promedios por sub-categoría de las reseñas de una propiedad. Cada campo es null
 * si no hay reseñas con esa categoría puntuada todavía.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumenCategoriasDTO {
    private Double limpieza;
    private Double ubicacion;
    private Double precio;
    private Double trato;
}
