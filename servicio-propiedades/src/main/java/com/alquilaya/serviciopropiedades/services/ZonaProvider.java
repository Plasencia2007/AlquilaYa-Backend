package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.clients.CatalogosClient;
import com.alquilaya.serviciopropiedades.dto.ZonaResolucionDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Provee las zonas de cobertura activas (con geometría) leídas de servicio-catalogos vía Feign,
 * cacheadas en memoria con un TTL corto (las zonas cambian muy poco). Si catalogos no responde,
 * se reusa el último valor conocido; si nunca hubo datos, se devuelve una lista vacía y el
 * resolver tratará la asignación como "sin datos" (no bloquea la publicación).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ZonaProvider {

    private final CatalogosClient catalogosClient;

    private static final long TTL_MS = 5 * 60 * 1000L;

    private volatile List<ZonaResolucionDTO> cache = List.of();
    private volatile long cacheAtMs = 0L;

    public List<ZonaResolucionDTO> get() {
        long now = System.currentTimeMillis();
        List<ZonaResolucionDTO> actual = cache;
        if (!actual.isEmpty() && now - cacheAtMs < TTL_MS) {
            return actual;
        }
        try {
            List<ZonaResolucionDTO> fresco = catalogosClient.listarZonasActivas();
            if (fresco != null && !fresco.isEmpty()) {
                cache = fresco;
                cacheAtMs = now;
                return fresco;
            }
        } catch (Exception e) {
            log.warn("[ZONAS] No se pudieron obtener las zonas activas de catalogos: {}", e.getMessage());
        }
        // Sin dato fresco: reusar el último conocido (puede ser vacío).
        return actual;
    }

    /**
     * Fuerza un refetch en el próximo {@link #get()} (conservando el último valor conocido como
     * fallback). Lo invoca el listener de eventos de catalogos cuando cambian las zonas, para no
     * esperar el TTL.
     */
    public void invalidate() {
        cacheAtMs = 0L;
    }
}
