package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.dto.LugarCercanoDTO;
import com.alquilaya.serviciopropiedades.dto.TiempoCaminandoDTO;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.services.LugaresCercanosService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Puntos de interés cercanos (#157) y tiempo real caminando (#158) a una propiedad,
 * cacheados server-side (ver {@link LugaresCercanosService}) para no exponer las APIs
 * públicas de Overpass/OSRM directamente a cada visitante desde el navegador.
 *
 * <p>La degradación graceful ante fallos de Overpass/OSRM vive AQUÍ (no en el service):
 * los métodos {@code @Cacheable} de {@link LugaresCercanosService} lanzan excepción cuando
 * la API externa falla, para que Spring NO cachee ese resultado degradado 24h — el catch
 * de esa excepción y el fallback al usuario ocurren en este controller, fuera del caché.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/propiedades")
@RequiredArgsConstructor
public class LugaresCercanosController {

    private final LugaresCercanosService lugaresCercanosService;
    private final PropiedadRepository propiedadRepository;

    @GetMapping("/{id}/lugares-cercanos")
    public ResponseEntity<List<LugarCercanoDTO>> lugaresCercanos(@PathVariable Long id) {
        Propiedad p = propiedadRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Propiedad no encontrada"));
        if (p.getLatitud() == null || p.getLongitud() == null) {
            return ResponseEntity.ok(List.of());
        }
        try {
            return ResponseEntity.ok(lugaresCercanosService.buscarCercanos(id, p.getLatitud(), p.getLongitud()));
        } catch (Exception e) {
            log.warn("[LUGARES-CERCANOS] Fallo consultando Overpass para propiedad {}: {}", id, e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/{id}/tiempo-caminando")
    public ResponseEntity<TiempoCaminandoDTO> tiempoCaminando(
            @PathVariable Long id,
            @RequestParam double destinoLat,
            @RequestParam double destinoLng) {
        Propiedad p = propiedadRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Propiedad no encontrada"));
        if (p.getLatitud() == null || p.getLongitud() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La propiedad no tiene coordenadas.");
        }
        try {
            return ResponseEntity.ok(lugaresCercanosService.tiempoCaminando(
                    id, p.getLatitud(), p.getLongitud(), destinoLat, destinoLng));
        } catch (Exception e) {
            log.warn("[TIEMPO-CAMINANDO] Fallo consultando OSRM para propiedad {}: {}", id, e.getMessage());
            double km = LugaresCercanosService.haversineKm(p.getLatitud(), p.getLongitud(), destinoLat, destinoLng);
            TiempoCaminandoDTO fallback = TiempoCaminandoDTO.builder()
                    .minutos(Math.max(1, (int) Math.round((km / 5) * 60)))
                    .distanciaKm(km)
                    .aproximado(true)
                    .build();
            return ResponseEntity.ok(fallback);
        }
    }
}
