package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.dto.ZonaResolucionDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Resuelve en qué zona de cobertura cae un punto (lat/lng) usando la geometría del catálogo:
 * dentro del radio para CIRCULO, dentro del perímetro para POLIGONO (ray casting). Las zonas
 * llegan ya ordenadas por prioridad, así que el primer match gana en caso de solapamiento.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ZonaResolver {

    private final ZonaProvider zonaProvider;
    private final ObjectMapper objectMapper;

    private static final double RADIO_TIERRA_KM = 6371.0;

    public enum Estado {
        /** El punto cae en una zona: se asignó zonaId/universidadId. */
        ASIGNADA,
        /** Hay zonas cargadas pero el punto no cae en ninguna: rechazar la publicación. */
        FUERA_DE_ZONA,
        /** No se pudo cargar el catálogo de zonas: no se asigna ni se bloquea por zona. */
        SIN_DATOS
    }

    public record Resultado(Estado estado, Long zonaId, Long universidadId, String zonaNombre) {
        static Resultado sinDatos() { return new Resultado(Estado.SIN_DATOS, null, null, null); }
        static Resultado fuera() { return new Resultado(Estado.FUERA_DE_ZONA, null, null, null); }
    }

    public Resultado resolver(Double lat, Double lng) {
        if (lat == null || lng == null) {
            return Resultado.sinDatos();
        }
        List<ZonaResolucionDTO> zonas = zonaProvider.get();
        if (zonas == null || zonas.isEmpty()) {
            return Resultado.sinDatos();
        }
        for (ZonaResolucionDTO z : zonas) {
            if (contiene(z, lat, lng)) {
                return new Resultado(Estado.ASIGNADA, z.getId(), z.getUniversidadId(), z.getNombre());
            }
        }
        return Resultado.fuera();
    }

    private boolean contiene(ZonaResolucionDTO z, double lat, double lng) {
        String tipo = z.getTipoLimite() == null ? "" : z.getTipoLimite().trim().toUpperCase();
        if ("CIRCULO".equals(tipo)) {
            if (z.getLatitud() == null || z.getLongitud() == null || z.getRadioKm() == null) {
                return false;
            }
            return distanciaKm(lat, lng, z.getLatitud(), z.getLongitud()) <= z.getRadioKm();
        }
        if ("POLIGONO".equals(tipo)) {
            return puntoEnPoligono(lat, lng, z.getPoligonoJson());
        }
        return false;
    }

    private double distanciaKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return RADIO_TIERRA_KM * c;
    }

    /**
     * Ray casting sobre el array JSON de vértices {@code [{ "lat":.., "lng":.. }, ...]}.
     * Se trabaja en grados (lng = x, lat = y); a escala de ciudad la distorsión es
     * despreciable y solo se decide pertenencia, no área.
     */
    private boolean puntoEnPoligono(double lat, double lng, String poligonoJson) {
        if (poligonoJson == null || poligonoJson.isBlank()) {
            return false;
        }
        try {
            JsonNode arr = objectMapper.readTree(poligonoJson);
            if (!arr.isArray() || arr.size() < 3) {
                return false;
            }
            int n = arr.size();
            boolean dentro = false;
            for (int i = 0, j = n - 1; i < n; j = i++) {
                JsonNode pi = arr.get(i);
                JsonNode pj = arr.get(j);
                if (pi == null || pj == null || !pi.hasNonNull("lat") || !pi.hasNonNull("lng")
                        || !pj.hasNonNull("lat") || !pj.hasNonNull("lng")) {
                    return false;
                }
                double yi = pi.get("lat").asDouble(), xi = pi.get("lng").asDouble();
                double yj = pj.get("lat").asDouble(), xj = pj.get("lng").asDouble();
                boolean cruza = (yi > lat) != (yj > lat)
                        && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi;
                if (cruza) {
                    dentro = !dentro;
                }
            }
            return dentro;
        } catch (Exception e) {
            log.warn("[ZONAS] Polígono inválido al resolver zona: {}", e.getMessage());
            return false;
        }
    }
}
