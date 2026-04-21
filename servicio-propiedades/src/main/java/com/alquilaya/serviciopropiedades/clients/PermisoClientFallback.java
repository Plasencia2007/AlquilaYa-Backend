package com.alquilaya.serviciopropiedades.clients;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class PermisoClientFallback implements PermisoClient {

    @Override
    public boolean verificarPermiso(String rol, String funcionalidad) {
        log.warn("[FEIGN FALLBACK] servicio-usuarios no disponible. Denegando permiso rol={} funcionalidad={}", rol, funcionalidad);
        return false;
    }
}
