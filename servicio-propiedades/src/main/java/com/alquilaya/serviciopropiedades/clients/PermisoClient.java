package com.alquilaya.serviciopropiedades.clients;

import com.alquilaya.serviciopropiedades.config.FeignConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "servicio-usuarios", configuration = FeignConfig.class, fallback = PermisoClientFallback.class)
public interface PermisoClient {

    @GetMapping("/api/v1/usuarios/permisos/check")
    boolean verificarPermiso(
            @RequestParam("rol") String rol,
            @RequestParam("funcionalidad") String funcionalidad);

    /**
     * Chequeo EFECTIVO por usuario (rol base ∪ roles personalizados, #32). El usuario se
     * resuelve del JWT propagado por Feign; por eso solo necesita la funcionalidad.
     */
    @GetMapping("/api/v1/usuarios/permisos/check-mio")
    boolean verificarPermisoEfectivo(@RequestParam("funcionalidad") String funcionalidad);
}
