package com.alquilaya.serviciopropiedades.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Conteo público de avisos por zona para la home (sección "Zonas destacadas").
 * {@code total} = número de propiedades publicadas y visibles en la zona;
 * {@code precioMin} = el precio más bajo de esa zona. Se llena vía constructor
 * expression desde una query agregada ({@code COUNT}/{@code MIN} + {@code GROUP BY zonaId}),
 * por eso el orden de los campos debe coincidir con el {@code SELECT new ...} del repositorio.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConteoZonaDTO {
    private Long zonaId;
    private Long total;
    private BigDecimal precioMin;
}
