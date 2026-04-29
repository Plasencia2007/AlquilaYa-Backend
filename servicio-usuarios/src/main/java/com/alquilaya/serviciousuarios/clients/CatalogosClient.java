package com.alquilaya.serviciousuarios.clients;

import com.alquilaya.serviciousuarios.config.FeignConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
        name = "servicio-catalogos",
        contextId = "catalogosClient",
        configuration = FeignConfig.class,
        fallback = CatalogosClientFallback.class
)
public interface CatalogosClient {

    @GetMapping("/api/v1/catalogos/carreras/existe/{id}")
    Boolean existeCarrera(@PathVariable("id") Long id);
}
