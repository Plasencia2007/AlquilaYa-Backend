package com.alquilaya.servicio_mensajeria.clients;

import com.alquilaya.servicio_mensajeria.config.FeignConfig;
import com.alquilaya.servicio_mensajeria.dto.PropiedadResumenDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
        name = "servicio-propiedades",
        contextId = "propiedadesClient",
        configuration = FeignConfig.class,
        fallback = PropiedadesClientFallback.class)
public interface PropiedadesClient {

    @GetMapping("/api/v1/propiedades/{id}/publico")
    PropiedadResumenDTO obtenerPropiedad(@PathVariable("id") Long id);
}
