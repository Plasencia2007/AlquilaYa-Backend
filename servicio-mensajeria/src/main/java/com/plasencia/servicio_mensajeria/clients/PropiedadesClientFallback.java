package com.plasencia.servicio_mensajeria.clients;

import com.plasencia.servicio_mensajeria.dto.PropiedadResumenDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class PropiedadesClientFallback implements PropiedadesClient {

    @Override
    public PropiedadResumenDTO obtenerPropiedad(Long id) {
        log.warn("Fallback obtenerPropiedad({}) — servicio-propiedades no disponible", id);
        PropiedadResumenDTO dto = new PropiedadResumenDTO();
        dto.setId(id);
        dto.setTitulo("Propiedad #" + id);
        return dto;
    }
}
