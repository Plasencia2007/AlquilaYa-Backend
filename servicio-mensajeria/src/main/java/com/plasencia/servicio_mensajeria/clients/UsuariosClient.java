package com.plasencia.servicio_mensajeria.clients;

import com.plasencia.servicio_mensajeria.config.FeignConfig;
import com.plasencia.servicio_mensajeria.dto.UsuarioPerfilDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
        name = "servicio-usuarios",
        contextId = "usuariosClient",
        configuration = FeignConfig.class,
        fallback = UsuariosClientFallback.class)
public interface UsuariosClient {

    @GetMapping("/api/v1/usuarios/arrendador/{perfilId}/info")
    UsuarioPerfilDTO obtenerArrendador(@PathVariable("perfilId") Long perfilId);

    @GetMapping("/api/v1/usuarios/estudiante/{perfilId}/info")
    UsuarioPerfilDTO obtenerEstudiante(@PathVariable("perfilId") Long perfilId);
}
