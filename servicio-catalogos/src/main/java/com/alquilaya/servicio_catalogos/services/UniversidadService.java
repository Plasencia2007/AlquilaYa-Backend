package com.alquilaya.servicio_catalogos.services;

import com.alquilaya.servicio_catalogos.dto.CampusPrincipalResponse;
import com.alquilaya.servicio_catalogos.dto.UniversidadRequest;
import com.alquilaya.servicio_catalogos.dto.UniversidadResponse;
import com.alquilaya.servicio_catalogos.dto.ZonaCoberturaRequest;
import com.alquilaya.servicio_catalogos.dto.ZonaResolucionResponse;
import com.alquilaya.servicio_catalogos.entities.Universidad;
import com.alquilaya.servicio_catalogos.entities.ZonaCobertura;
import com.alquilaya.servicio_catalogos.enums.TipoLimite;
import com.alquilaya.servicio_catalogos.repositories.UniversidadRepository;
import com.alquilaya.servicio_catalogos.repositories.ZonaCoberturaRepository;
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
     * Todas las zonas ACTIVAS de universidades ACTIVAS, en formato plano para resolución de
     * pertenencia. Las consume servicio-propiedades para asignar la zona a una propiedad al
     * publicarla. Ordenadas por prioridad para que el primer match gane en solapamientos.
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
