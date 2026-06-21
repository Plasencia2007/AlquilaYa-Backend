package com.alquilaya.serviciousuarios.clients;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Campus principal recibido de servicio-catalogos. Ancla la validación de cercanía del
 * arrendador en vez de las coordenadas de UPeU antes quemadas.
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
