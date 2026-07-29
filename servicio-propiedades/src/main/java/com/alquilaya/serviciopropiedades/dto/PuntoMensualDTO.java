package com.alquilaya.serviciopropiedades.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Punto genérico de una serie mensual (ítem 321): a diferencia de
 * {@link IngresoMensualDTO} (que fija un {@code BigDecimal monto}), este DTO se reutiliza
 * para cualquier serie de 7 meses cuyo valor sea un número simple (ej. % de ocupación).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PuntoMensualDTO {
    private String mes;
    private Double valor;
}
