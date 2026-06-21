package com.alquilaya.serviciopropiedades.clients;

import com.alquilaya.serviciopropiedades.config.FeignConfig;
import com.alquilaya.serviciopropiedades.dto.CampusPrincipalDTO;
import com.alquilaya.serviciopropiedades.dto.ZonaResolucionDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@FeignClient(name = "servicio-catalogos", contextId = "catalogosClient", configuration = FeignConfig.class, fallback = CatalogosClientFallback.class)
public interface CatalogosClient {

    /** Endpoint público de catalogos: no requiere JWT (sirve para seed/búsqueda anónima). */
    @GetMapping("/api/v1/catalogos/universidades/principal")
    CampusPrincipalDTO obtenerCampusPrincipal();

    /** Zonas activas con geometría (público): para resolver la zona de una propiedad al publicar. */
    @GetMapping("/api/v1/catalogos/universidades/zonas/activas")
    List<ZonaResolucionDTO> listarZonasActivas();
}
