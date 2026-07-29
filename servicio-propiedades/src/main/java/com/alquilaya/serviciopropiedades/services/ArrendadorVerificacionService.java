package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.clients.UsuariosClient;
import com.alquilaya.serviciopropiedades.dto.ArrendadorInfoDTO;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Resuelve el filtro "solo arrendadores verificados" (ítem 125) consultando
 * servicio-usuarios (única fuente de verdad de {@code Arrendador.verificado}) en vez de
 * denormalizar el flag en propiedades — así nunca queda desactualizado.
 *
 * <p>Clase separada (no un método más de {@link PropiedadService}) para que el
 * {@code @Cacheable} funcione: Spring cachea vía proxy AOP, que NO intercepta llamadas
 * {@code this.metodo()} dentro de la misma clase (self-invocation). Al vivir en un bean
 * distinto, la llamada desde {@link PropiedadService} sí pasa por el proxy.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArrendadorVerificacionService {

    private final PropiedadRepository propiedadRepository;
    private final UsuariosClient usuariosClient;

    /**
     * Ids de arrendadores verificados, acotado al universo de arrendadores con avisos
     * activos (bounded, no todo el catálogo de usuarios). Cacheado 5 min (TTL por defecto
     * del cache manager de este servicio) para no golpear Feign en cada búsqueda con el
     * toggle activo. Si servicio-usuarios no responde, el fallback de {@link UsuariosClient}
     * ya devuelve lista vacía (no lanza) — "solo verificados" degrada a "sin resultados"
     * en vez de fallar la búsqueda completa.
     */
    @Cacheable("propiedades:arrendadoresVerificados")
    public List<Long> idsVerificados() {
        List<Long> arrendadorIds = propiedadRepository.arrendadorIdsActivos();
        if (arrendadorIds.isEmpty()) return List.of();
        List<ArrendadorInfoDTO> info = usuariosClient.obtenerArrendadoresBulkPublico(arrendadorIds);
        return info.stream()
                .filter(a -> Boolean.TRUE.equals(a.getVerificado()))
                .map(ArrendadorInfoDTO::getId)
                .toList();
    }
}
