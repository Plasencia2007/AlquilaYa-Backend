package com.alquilaya.serviciopropiedades.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Tiempo caminando (a pie) entre una propiedad y un destino (p.ej. la universidad más
 * cercana), resuelto vía OSRM foot-routing y cacheado en Redis por propiedad+destino
 * ({@code LugaresCercanosService}). {@code aproximado=true} cuando OSRM no respondió y se
 * cayó a una estimación en línea recta (Haversine / 5 km/h).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TiempoCaminandoDTO {
    private Integer minutos;
    private Double distanciaKm;
    private boolean aproximado;
}
