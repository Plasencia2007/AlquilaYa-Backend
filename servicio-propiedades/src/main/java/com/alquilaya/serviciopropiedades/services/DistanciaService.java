package com.alquilaya.serviciopropiedades.services;

import org.springframework.stereotype.Service;

@Service
public class DistanciaService {

    private static final double UPEU_LAT = -11.9878;
    private static final double UPEU_LNG = -76.8980;
    private static final double RADIO_TIERRA_METROS = 6_371_000.0;

    public Integer distanciaAUpeuMetros(Double lat, Double lng) {
        if (lat == null || lng == null) {
            return null;
        }
        double dLat = Math.toRadians(lat - UPEU_LAT);
        double dLng = Math.toRadians(lng - UPEU_LNG);
        double latOrigen = Math.toRadians(UPEU_LAT);
        double latDestino = Math.toRadians(lat);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(latOrigen) * Math.cos(latDestino);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (int) Math.round(RADIO_TIERRA_METROS * c);
    }
}
