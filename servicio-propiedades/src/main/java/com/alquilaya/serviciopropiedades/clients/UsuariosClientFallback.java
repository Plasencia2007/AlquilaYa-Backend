package com.alquilaya.serviciopropiedades.clients;

import com.alquilaya.serviciopropiedades.dto.ArrendadorInfoDTO;
import com.alquilaya.serviciopropiedades.dto.EstudianteInfoDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Slf4j
@Component
public class UsuariosClientFallback implements UsuariosClient {

    @Override
    public ArrendadorInfoDTO obtenerArrendador(Long perfilId) {
        log.warn("[FEIGN FALLBACK] servicio-usuarios no disponible. No se puede obtener arrendador {}", perfilId);
        return null;
    }

    @Override
    public EstudianteInfoDTO obtenerEstudiante(Long perfilId) {
        log.warn("[FEIGN FALLBACK] servicio-usuarios no disponible. No se puede obtener estudiante {}", perfilId);
        return null;
    }

    @Override
    public List<ArrendadorInfoDTO> obtenerArrendadoresBulk(List<Long> ids) {
        log.warn("[FEIGN FALLBACK] servicio-usuarios no disponible. No se puede obtener arrendadores bulk (n={})",
                ids == null ? 0 : ids.size());
        return Collections.emptyList();
    }
}
