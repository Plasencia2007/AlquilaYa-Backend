package com.alquilaya.serviciopropiedades.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Sugerencia de precio al publicar, calculada de avisos aprobados parecidos.
 * {@code ambito} indica de dónde salió: "ZONA", "UNIVERSIDAD" o "" si no hay datos.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrecioSugeridoDTO {
    private BigDecimal min;
    private BigDecimal promedio;
    private BigDecimal max;
    private int cantidad;
    private String ambito;
}
