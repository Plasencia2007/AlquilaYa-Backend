package com.alquilaya.servicio_mensajeria.clients;

import com.alquilaya.servicio_mensajeria.dto.PreferenciasNotificacionDTO;
import com.alquilaya.servicio_mensajeria.dto.UsuarioPerfilDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

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

    /** Fail-open (ítem 210): si servicio-usuarios no responde, se notifica igual (los 3 flags
     *  del DTO ya nacen en true) en vez de silenciar notificaciones por una caída de infra. */
    @Override
    public PreferenciasNotificacionDTO obtenerPreferenciasNotificacion(Long id) {
        log.warn("Fallback obtenerPreferenciasNotificacion({}) — servicio-usuarios no disponible; fail-open", id);
        return new PreferenciasNotificacionDTO();
    }

    /** Ítem 378: si servicio-usuarios no responde, no hay a quién notificar — lista vacía. */
    @Override
    public List<Long> obtenerAdminsActivos() {
        log.warn("Fallback obtenerAdminsActivos() — servicio-usuarios no disponible");
        return List.of();
    }
}
