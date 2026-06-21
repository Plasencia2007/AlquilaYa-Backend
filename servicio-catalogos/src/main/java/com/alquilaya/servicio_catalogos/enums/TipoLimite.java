package com.alquilaya.servicio_catalogos.enums;

/**
 * Tipo de límite geográfico de una {@code ZonaCobertura}.
 *
 * <ul>
 *   <li>{@code CIRCULO}: área circular definida por un centro (lat/lng) y un radio en km.</li>
 *   <li>{@code POLIGONO}: área definida por un array JSON de coordenadas {@code [{lat,lng}...]}.</li>
 * </ul>
 */
public enum TipoLimite {
    CIRCULO,
    POLIGONO
}
