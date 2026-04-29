package com.alquilaya.serviciousuarios.clients;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class CatalogosClientFallback implements CatalogosClient {

    @Override
    public Boolean existeCarrera(Long id) {
        log.warn("[FEIGN FALLBACK] servicio-catalogos no disponible. " +
                "No se puede validar carreraId={}. Se asume válida temporalmente.", id);
        return null;
    }
}
