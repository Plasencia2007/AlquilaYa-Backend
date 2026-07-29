package com.alquilaya.servicio_catalogos.services;

import com.alquilaya.servicio_catalogos.dto.CampusPrincipalResponse;
import com.alquilaya.servicio_catalogos.dto.UniversidadRequest;
import com.alquilaya.servicio_catalogos.dto.UniversidadResponse;
import com.alquilaya.servicio_catalogos.dto.ZonaCoberturaRequest;
import com.alquilaya.servicio_catalogos.dto.ZonaPublicaResponse;
import com.alquilaya.servicio_catalogos.dto.ZonaResolucionResponse;
import com.alquilaya.servicio_catalogos.entities.Universidad;
import com.alquilaya.servicio_catalogos.entities.ZonaCobertura;
import com.alquilaya.servicio_catalogos.enums.TipoLimite;
import com.alquilaya.servicio_catalogos.repositories.UniversidadRepository;
import com.alquilaya.servicio_catalogos.repositories.ZonaCoberturaRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UniversidadService {

    private final UniversidadRepository repository;
    private final ZonaCoberturaRepository zonaRepository;
    private final CatalogosEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    @Cacheable(value = "universidadesActivas")
    @Transactional(readOnly = true)
    public List<UniversidadResponse> listarActivas() {
        return repository.findByActivoTrueOrderByNombreAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UniversidadResponse> listarTodas() {
        return repository.findAllByOrderByNombreAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UniversidadResponse obtener(Long id) {
        return toResponse(buscar(id));
    }

    @Transactional(readOnly = true)
    public boolean existeActiva(Long id) {
        return repository.existsByIdAndActivoTrue(id);
    }

    /**
     * Campus principal = primera universidad activa (orden alfabético) + su zona circular
     * activa de mayor prioridad. Si no tiene círculo, cae al punto de referencia de la
     * universidad. Lo consumen propiedades/usuarios como ancla de cercanía. {@code null} si
     * no hay universidades activas.
     */
    @Transactional(readOnly = true)
    public CampusPrincipalResponse obtenerPrincipal() {
        // Campus principal explícito (flag esPrincipal); si no hay, fallback a la primera activa.
        Universidad u = repository.findFirstByEsPrincipalTrueAndActivoTrueOrderByNombreAsc()
                .orElseGet(() -> repository.findByActivoTrueOrderByNombreAsc()
                        .stream().findFirst().orElse(null));
        if (u == null) {
            return null;
        }
        ZonaCobertura circulo = zonaRepository.findByUniversidadIdOrderByOrdenPrioridadAsc(u.getId())
                .stream()
                .filter(z -> Boolean.TRUE.equals(z.getActivo()))
                .filter(z -> z.getTipoLimite() == TipoLimite.CIRCULO)
                .filter(z -> z.getLatitud() != null && z.getLongitud() != null && z.getRadioKm() != null)
                .findFirst()
                .orElse(null);
        return CampusPrincipalResponse.builder()
                .id(u.getId())
                .nombre(u.getNombre())
                .latitud(circulo != null ? circulo.getLatitud() : u.getLatitud())
                .longitud(circulo != null ? circulo.getLongitud() : u.getLongitud())
                .radioKm(circulo != null ? circulo.getRadioKm() : null)
                .build();
    }

    /**
     * Vista PÚBLICA de las zonas activas: la misma lista plana con geometría, pero SIN la comisión
     * de plataforma. La consumen visitantes anónimos (búsqueda, mapa, calculadora de ingresos). Se
     * deriva de {@link #listarZonasActivas()} para no duplicar la consulta ni el orden por prioridad.
     */
    @Transactional(readOnly = true)
    public List<ZonaPublicaResponse> listarZonasPublicas() {
        return listarZonasActivas().stream()
                .map(z -> ZonaPublicaResponse.builder()
                        .id(z.getId())
                        .universidadId(z.getUniversidadId())
                        .universidadNombre(z.getUniversidadNombre())
                        .nombre(z.getNombre())
                        .descripcion(z.getDescripcion())
                        .color(z.getColor())
                        .ordenPrioridad(z.getOrdenPrioridad())
                        .tipoLimite(z.getTipoLimite())
                        .latitud(z.getLatitud())
                        .longitud(z.getLongitud())
                        .radioKm(z.getRadioKm())
                        .poligonoJson(z.getPoligonoJson())
                        .build())
                .toList();
    }

    /**
     * Vista INTERNA de todas las zonas ACTIVAS de universidades ACTIVAS, en formato plano para
     * resolución de pertenencia. INCLUYE la comisión de plataforma por zona. La consume
     * servicio-propiedades (vía el endpoint interno protegido por cabecera) para asignar la zona a
     * una propiedad al publicarla y calcular la comisión de cada venta. Ordenadas por prioridad
     * para que el primer match gane en solapamientos.
     */
    @Transactional(readOnly = true)
    public List<ZonaResolucionResponse> listarZonasActivas() {
        List<ZonaResolucionResponse> resultado = new ArrayList<>();
        for (Universidad u : repository.findByActivoTrueOrderByNombreAsc()) {
            zonaRepository.findByUniversidadIdOrderByOrdenPrioridadAsc(u.getId()).stream()
                    .filter(z -> Boolean.TRUE.equals(z.getActivo()))
                    .forEach(z -> resultado.add(ZonaResolucionResponse.builder()
                            .id(z.getId())
                            .universidadId(u.getId())
                            .universidadNombre(u.getNombre())
                            .nombre(z.getNombre())
                            .descripcion(z.getDescripcion())
                            .color(z.getColor())
                            .ordenPrioridad(z.getOrdenPrioridad())
                            .tipoLimite(z.getTipoLimite())
                            .latitud(z.getLatitud())
                            .longitud(z.getLongitud())
                            .radioKm(z.getRadioKm())
                            .poligonoJson(z.getPoligonoJson())
                            .comisionPorcentaje(z.getComisionPorcentaje())
                            .comisionMonto(z.getComisionMonto())
                            .build()));
        }
        resultado.sort(java.util.Comparator.comparing(
                ZonaResolucionResponse::getOrdenPrioridad,
                java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())));
        return resultado;
    }

    @CacheEvict(value = "universidadesActivas", allEntries = true)
    @Transactional
    public UniversidadResponse crear(UniversidadRequest req) {
        String nombre = req.getNombre().trim();
        if (repository.existsByNombreIgnoreCase(nombre)) {
            throw new IllegalArgumentException(
                    "Ya existe una universidad con el nombre '" + req.getNombre() + "'");
        }
        boolean principal = Boolean.TRUE.equals(req.getEsPrincipal());
        Universidad universidad = Universidad.builder()
                .nombre(nombre)
                .descripcion(trimOrNull(req.getDescripcion()))
                .color(trimOrNull(req.getColor()))
                .latitud(req.getLatitud())
                .longitud(req.getLongitud())
                .activo(req.getActivo() != null ? req.getActivo() : true)
                .esPrincipal(principal)
                .build();
        Universidad guardada = repository.save(universidad);
        if (principal) {
            repository.clearPrincipalExcept(guardada.getId());
        }
        reemplazarZonas(guardada.getId(), req.getZonas());
        eventPublisher.publicarCambioUniversidades();
        return toResponse(guardada);
    }

    @CacheEvict(value = "universidadesActivas", allEntries = true)
    @Transactional
    public UniversidadResponse actualizar(Long id, UniversidadRequest req) {
        Universidad existente = buscar(id);
        String nuevoNombre = req.getNombre().trim();
        if (!existente.getNombre().equalsIgnoreCase(nuevoNombre)
                && repository.existsByNombreIgnoreCase(nuevoNombre)) {
            throw new IllegalArgumentException(
                    "Ya existe una universidad con el nombre '" + nuevoNombre + "'");
        }
        existente.setNombre(nuevoNombre);
        existente.setDescripcion(trimOrNull(req.getDescripcion()));
        existente.setColor(trimOrNull(req.getColor()));
        existente.setLatitud(req.getLatitud());
        existente.setLongitud(req.getLongitud());
        if (req.getActivo() != null) {
            existente.setActivo(req.getActivo());
        }
        if (req.getEsPrincipal() != null) {
            existente.setEsPrincipal(req.getEsPrincipal());
        }
        Universidad guardada = repository.save(existente);
        if (Boolean.TRUE.equals(guardada.getEsPrincipal())) {
            repository.clearPrincipalExcept(guardada.getId());
        }
        reemplazarZonas(id, req.getZonas());
        eventPublisher.publicarCambioUniversidades();
        return toResponse(guardada);
    }

    @CacheEvict(value = "universidadesActivas", allEntries = true)
    @Transactional
    public void eliminar(Long id) {
        if (!repository.existsById(id)) {
            throw new EntityNotFoundException("Universidad con id " + id + " no encontrada");
        }
        zonaRepository.deleteByUniversidadId(id);
        repository.deleteById(id);
        eventPublisher.publicarCambioUniversidades();
    }

    // ---- helpers ----

    private Universidad buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Universidad con id " + id + " no encontrada"));
    }

    private UniversidadResponse toResponse(Universidad u) {
        return UniversidadResponse.from(u,
                zonaRepository.findByUniversidadIdOrderByOrdenPrioridadAsc(u.getId()));
    }

    /** Reemplaza atómicamente el conjunto de zonas de una universidad. */
    private void reemplazarZonas(Long universidadId, List<ZonaCoberturaRequest> zonas) {
        zonaRepository.deleteByUniversidadId(universidadId);
        zonaRepository.flush();
        if (zonas == null || zonas.isEmpty()) {
            return;
        }
        List<ZonaCobertura> nuevas = new ArrayList<>();
        for (ZonaCoberturaRequest z : zonas) {
            nuevas.add(construirZona(universidadId, z));
        }
        zonaRepository.saveAll(nuevas);
    }

    private ZonaCobertura construirZona(Long universidadId, ZonaCoberturaRequest req) {
        TipoLimite tipo = req.getTipoLimite() != null ? req.getTipoLimite() : TipoLimite.CIRCULO;
        validarGeometria(tipo, req);
        return ZonaCobertura.builder()
                .universidadId(universidadId)
                .nombre(req.getNombre().trim())
                .descripcion(trimOrNull(req.getDescripcion()))
                .color(trimOrNull(req.getColor()))
                .activo(req.getActivo() != null ? req.getActivo() : true)
                .ordenPrioridad(req.getOrdenPrioridad() != null ? req.getOrdenPrioridad() : 0)
                .tipoLimite(tipo)
                .latitud(req.getLatitud())
                .longitud(req.getLongitud())
                .radioKm(req.getRadioKm())
                .poligonoJson(trimOrNull(req.getPoligonoJson()))
                .comisionPorcentaje(req.getComisionPorcentaje())
                .comisionMonto(req.getComisionMonto())
                .build();
    }

    private void validarGeometria(TipoLimite tipo, ZonaCoberturaRequest req) {
        if (tipo == TipoLimite.CIRCULO) {
            if (req.getLatitud() == null || req.getLongitud() == null) {
                throw new IllegalArgumentException(
                        "La zona '" + req.getNombre() + "' (círculo) requiere latitud y longitud");
            }
            if (req.getRadioKm() == null || req.getRadioKm() <= 0) {
                throw new IllegalArgumentException(
                        "La zona '" + req.getNombre() + "' (círculo) requiere un radio en km mayor a 0");
            }
        } else if (tipo == TipoLimite.POLIGONO) {
            if (req.getPoligonoJson() == null || req.getPoligonoJson().trim().isEmpty()) {
                throw new IllegalArgumentException(
                        "La zona '" + req.getNombre() + "' (polígono) requiere el JSON de coordenadas");
            }
            validarPoligonoJson(req.getNombre(), req.getPoligonoJson());
        }
    }

    /**
     * Valida que {@code poligonoJson} sea un array JSON de al menos 3 vértices
     * {@code {"lat":.., "lng":..}} con coordenadas en rango válido. Mismo formato que
     * consume {@code ZonaResolver} en servicio-propiedades (ray casting sobre lat/lng).
     * No detecta auto-intersección: solo cubre el caso más común de polígono corrupto.
     */
    private void validarPoligonoJson(String nombreZona, String poligonoJson) {
        JsonNode arr;
        try {
            arr = objectMapper.readTree(poligonoJson);
        } catch (Exception e) {
            throw new IllegalArgumentException(
                    "La zona '" + nombreZona + "' (polígono) tiene un JSON de coordenadas inválido");
        }
        if (arr == null || !arr.isArray() || arr.size() < 3) {
            throw new IllegalArgumentException(
                    "La zona '" + nombreZona + "' (polígono) requiere al menos 3 vértices");
        }
        for (JsonNode punto : arr) {
            if (punto == null || !punto.hasNonNull("lat") || !punto.hasNonNull("lng")
                    || !punto.get("lat").isNumber() || !punto.get("lng").isNumber()) {
                throw new IllegalArgumentException(
                        "La zona '" + nombreZona + "' (polígono) tiene un vértice sin lat/lng numéricos");
            }
            double lat = punto.get("lat").asDouble();
            double lng = punto.get("lng").asDouble();
            if (lat < -90.0 || lat > 90.0) {
                throw new IllegalArgumentException(
                        "La zona '" + nombreZona + "' (polígono) tiene una latitud fuera de rango (-90 a 90): " + lat);
            }
            if (lng < -180.0 || lng > 180.0) {
                throw new IllegalArgumentException(
                        "La zona '" + nombreZona + "' (polígono) tiene una longitud fuera de rango (-180 a 180): " + lng);
            }
        }
    }

    private String trimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
