package com.alquilaya.serviciopropiedades.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Campus principal recibido de servicio-catalogos (universidad activa + zona circular).
 * Ancla las distancias y la validación de cercanía en vez de las coordenadas quemadas.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampusPrincipalDTO {

    private Long id;
    private String nombre;
    private Double latitud;
    private Double longitud;
    private Double radioKm;
}
