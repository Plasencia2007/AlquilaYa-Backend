package com.alquilaya.serviciopropiedades.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Precio por temporada/ciclo expuesto en DTOs y endpoints. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrecioTemporadaDTO {
    private Long id;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
    private BigDecimal precio;
    private String etiqueta;
}
