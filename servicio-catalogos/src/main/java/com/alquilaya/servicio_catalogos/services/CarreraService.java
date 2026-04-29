package com.alquilaya.servicio_catalogos.services;

import com.alquilaya.servicio_catalogos.dto.CarreraRequest;
import com.alquilaya.servicio_catalogos.entities.Carrera;
import com.alquilaya.servicio_catalogos.repositories.CarreraRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CarreraService {

    private final CarreraRepository repository;

    @Cacheable(value = "carrerasActivas")
    @Transactional(readOnly = true)
    public List<Carrera> listarActivas() {
        return repository.findByActivoTrueOrderByNombreAsc();
    }

    @Transactional(readOnly = true)
    public List<Carrera> listarTodas() {
        return repository.findAllByOrderByNombreAsc();
    }

    @Transactional(readOnly = true)
    public Carrera obtener(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Carrera con id " + id + " no encontrada"));
    }

    @Transactional(readOnly = true)
    public boolean existeActiva(Long id) {
        return repository.existsByIdAndActivoTrue(id);
    }

    @CacheEvict(value = "carrerasActivas", allEntries = true)
    @Transactional
    public Carrera crear(CarreraRequest req) {
        if (repository.existsByNombreIgnoreCase(req.getNombre().trim())) {
            throw new IllegalArgumentException(
                    "Ya existe una carrera con el nombre '" + req.getNombre() + "'");
        }
        Carrera carrera = Carrera.builder()
                .nombre(req.getNombre().trim())
                .codigo(req.getCodigo() != null ? req.getCodigo().trim() : null)
                .activo(req.getActivo() != null ? req.getActivo() : true)
                .build();
        return repository.save(carrera);
    }

    @CacheEvict(value = "carrerasActivas", allEntries = true)
    @Transactional
    public Carrera actualizar(Long id, CarreraRequest req) {
        Carrera existente = obtener(id);
        String nuevoNombre = req.getNombre().trim();
        if (!existente.getNombre().equalsIgnoreCase(nuevoNombre)
                && repository.existsByNombreIgnoreCase(nuevoNombre)) {
            throw new IllegalArgumentException(
                    "Ya existe una carrera con el nombre '" + nuevoNombre + "'");
        }
        existente.setNombre(nuevoNombre);
        existente.setCodigo(req.getCodigo() != null ? req.getCodigo().trim() : null);
        if (req.getActivo() != null) {
            existente.setActivo(req.getActivo());
        }
        return repository.save(existente);
    }

    @CacheEvict(value = "carrerasActivas", allEntries = true)
    @Transactional
    public void eliminar(Long id) {
        if (!repository.existsById(id)) {
            throw new EntityNotFoundException("Carrera con id " + id + " no encontrada");
        }
        repository.deleteById(id);
    }
}
