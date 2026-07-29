package com.alquilaya.serviciopropiedades.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Punto de interés cercano a una propiedad (supermercado, farmacia, banco, paradero,
 * universidad...), resuelto vía Overpass API y cacheado en Redis por propiedad
 * ({@code LugaresCercanosService}). Espejo de `NearbyPlace` del frontend, con la
 * {@code categoria} embebida en cada item (antes se agrupaba client-side).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LugarCercanoDTO {
    /** universidad | mercado | farmacia | banco | paradero. */
    private String categoria;
    private String nombre;
    private Double lat;
    private Double lng;
    private Double distanciaM;
}
