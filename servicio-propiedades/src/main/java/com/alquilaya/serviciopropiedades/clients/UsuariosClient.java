package com.alquilaya.serviciopropiedades.clients;

import com.alquilaya.serviciopropiedades.dto.ArrendadorInfoDTO;
import com.alquilaya.serviciopropiedades.dto.EstudianteInfoDTO;
import com.alquilaya.serviciopropiedades.config.FeignConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "servicio-usuarios", contextId = "usuariosClient", configuration = FeignConfig.class, fallback = UsuariosClientFallback.class)
public interface UsuariosClient {

    @GetMapping("/api/v1/usuarios/arrendador/{perfilId}/info")
    ArrendadorInfoDTO obtenerArrendador(@PathVariable("perfilId") Long perfilId);

    @GetMapping("/api/v1/usuarios/estudiante/{perfilId}/info")
    EstudianteInfoDTO obtenerEstudiante(@PathVariable("perfilId") Long perfilId);
}
