package com.alquilaya.serviciopropiedades.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DistanciaService {

    private final CampusProvider campusProvider;

    private static final double RADIO_TIERRA_METROS = 6_371_000.0;

    /**
     * Distancia en metros desde un punto al campus principal (definido en el catálogo de
     * universidades). Antes anclaba a coordenadas de UPeU quemadas; ahora las lee del catálogo.
     */
    public Integer distanciaACampusMetros(Double lat, Double lng) {
        if (lat == null || lng == null) {
            return null;
        }
        CampusProvider.Campus campus = campusProvider.get();
        double dLat = Math.toRadians(lat - campus.lat());
        double dLng = Math.toRadians(lng - campus.lng());
        double latOrigen = Math.toRadians(campus.lat());
        double latDestino = Math.toRadians(lat);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(latOrigen) * Math.cos(latDestino);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (int) Math.round(RADIO_TIERRA_METROS * c);
    }
}
