package com.alquilaya.serviciopropiedades.clients;

import com.alquilaya.serviciopropiedades.dto.ArrendadorInfoDTO;
import com.alquilaya.serviciopropiedades.dto.EstudianteInfoDTO;
import com.alquilaya.serviciopropiedades.config.FeignConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@FeignClient(name = "servicio-usuarios", contextId = "usuariosClient", configuration = FeignConfig.class, fallback = UsuariosClientFallback.class)
public interface UsuariosClient {

    @GetMapping("/api/v1/usuarios/arrendador/{perfilId}/info")
    ArrendadorInfoDTO obtenerArrendador(@PathVariable("perfilId") Long perfilId);

    @GetMapping("/api/v1/usuarios/estudiante/{perfilId}/info")
    EstudianteInfoDTO obtenerEstudiante(@PathVariable("perfilId") Long perfilId);

    /**
     * Bulk de arrendadores para enriquecer listados de propiedades (card premium).
     * Una sola llamada por página → evita N+1 sobre 20 items.
     */
    @PostMapping("/api/v1/usuarios/arrendadores/bulk")
    List<ArrendadorInfoDTO> obtenerArrendadoresBulk(@RequestBody List<Long> ids);
}
