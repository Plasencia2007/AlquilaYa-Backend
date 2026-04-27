package com.alquilaya.servicio_mensajeria.clients;

import com.alquilaya.servicio_mensajeria.dto.UsuarioPerfilDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Graceful degradation: si servicio-usuarios no responde, mostramos la conversación
 * con nombres genéricos en vez de fallar. El id del perfil siempre está disponible.
 */
@Slf4j
@Component
public class UsuariosClientFallback implements UsuariosClient {

    @Override
    public UsuarioPerfilDTO obtenerArrendador(Long perfilId) {
        log.warn("Fallback obtenerArrendador({}) — servicio-usuarios no disponible", perfilId);
        UsuarioPerfilDTO dto = new UsuarioPerfilDTO();
        dto.setId(perfilId);
        dto.setNombre("Arrendador");
        return dto;
    }

    @Override
    public UsuarioPerfilDTO obtenerEstudiante(Long perfilId) {
        log.warn("Fallback obtenerEstudiante({}) — servicio-usuarios no disponible", perfilId);
        UsuarioPerfilDTO dto = new UsuarioPerfilDTO();
        dto.setId(perfilId);
        dto.setNombre("Estudiante");
        return dto;
    }
}
