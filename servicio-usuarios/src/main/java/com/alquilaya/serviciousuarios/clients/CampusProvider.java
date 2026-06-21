package com.alquilaya.serviciousuarios.clients;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Provee el campus principal (coords + radio) como única fuente de verdad para la validación
 * de cercanía del arrendador. Lee de servicio-catalogos vía Feign y cachea en memoria con TTL
 * corto; si catalogos no responde, usa el último valor conocido o un respaldo fijo para no
 * bloquear el registro.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CampusProvider {

    private final CatalogosClient catalogosClient;

    // Respaldo unificado: mismas coords que usa el frontend (lib/geo.ts).
    private static final double FALLBACK_LAT = -11.99024;
    private static final double FALLBACK_LNG = -76.83992;
    private static final double FALLBACK_RADIO_KM = 15.0;
    private static final long TTL_MS = 5 * 60 * 1000L;

    private volatile Campus cache;
    private volatile long cacheAtMs = 0L;

    public Campus get() {
        long now = System.currentTimeMillis();
        Campus actual = cache;
        if (actual != null && now - cacheAtMs < TTL_MS) {
            return actual;
        }
        try {
            CampusPrincipalDTO dto = catalogosClient.obtenerCampusPrincipal();
            if (dto != null && dto.getLatitud() != null && dto.getLongitud() != null) {
                double radio = dto.getRadioKm() != null ? dto.getRadioKm() : FALLBACK_RADIO_KM;
                actual = new Campus(dto.getLatitud(), dto.getLongitud(), radio);
                cache = actual;
                cacheAtMs = now;
                return actual;
            }
        } catch (Exception e) {
            log.warn("[CAMPUS] No se pudo obtener el campus principal de catalogos: {}", e.getMessage());
        }
        return actual != null ? actual : new Campus(FALLBACK_LAT, FALLBACK_LNG, FALLBACK_RADIO_KM);
    }

    /** Holder inmutable del campus activo. */
    public record Campus(double lat, double lng, double radioKm) {}
}
