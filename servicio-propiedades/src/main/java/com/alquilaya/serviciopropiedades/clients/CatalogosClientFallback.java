package com.alquilaya.serviciopropiedades.clients;

import com.alquilaya.serviciopropiedades.dto.CampusPrincipalDTO;
import com.alquilaya.serviciopropiedades.dto.ZonaResolucionDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Slf4j
@Component
public class CatalogosClientFallback implements CatalogosClient {

    @Override
    public CampusPrincipalDTO obtenerCampusPrincipal() {
        log.warn("[FEIGN FALLBACK] servicio-catalogos no disponible. Se usará el campus de respaldo.");
        return null;
    }

    @Override
    public List<ZonaResolucionDTO> listarZonasActivas() {
        log.warn("[FEIGN FALLBACK] servicio-catalogos no disponible. No se pueden resolver zonas; se omite la asignación.");
        return Collections.emptyList();
    }
}
