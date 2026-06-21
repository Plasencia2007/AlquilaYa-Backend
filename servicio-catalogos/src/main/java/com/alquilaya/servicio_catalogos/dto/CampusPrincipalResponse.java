package com.alquilaya.servicio_catalogos.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Vista mínima del "campus principal" (primera universidad activa + su zona circular
 * principal) que consumen otros servicios para anclar distancias y validar cercanía.
 * Reemplaza las coordenadas de UPeU antes quemadas en propiedades y usuarios.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampusPrincipalResponse {

    private Long id;
    private String nombre;
    private Double latitud;
    private Double longitud;
    private Double radioKm;
}
