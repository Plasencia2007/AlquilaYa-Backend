package com.alquilaya.servicio_catalogos.services;

import com.alquilaya.servicio_catalogos.dto.ItemCatalogoRequest;
import com.alquilaya.servicio_catalogos.entities.ItemCatalogo;
import com.alquilaya.servicio_catalogos.enums.TipoItem;
import com.alquilaya.servicio_catalogos.repositories.ItemCatalogoRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ItemCatalogoService {

    private final ItemCatalogoRepository repository;

    @Cacheable(value = "filtrosActivos")
    public Map<String, List<ItemCatalogo>> obtenerFiltrosActivos() {
        // Clave String (nombre del enum), no TipoItem: al releer de Redis el Map
        // vuelve con claves String y, si el tipo declarado fuera Map<TipoItem,..>,
        // Jackson intentaría castear String->Enum al serializar la respuesta (500).
        // El frontend ya consume claves "SERVICIO"/"REGLA"/etc.
        return repository.findByActivoTrue().stream()
                .collect(Collectors.groupingBy(item -> item.getTipo().name()));
    }

    public List<ItemCatalogo> listarPorTipo(TipoItem tipo) {
        return repository.findByTipoAndActivoTrue(tipo);
    }

    public List<ItemCatalogo> listarTodo() {
        return repository.findAll();
    }

    @CacheEvict(value = "filtrosActivos", allEntries = true)
    public ItemCatalogo guardar(ItemCatalogoRequest request) {
        ItemCatalogo item = ItemCatalogo.builder()
                .nombre(request.getNombre())
                .valor(request.getValor())
                .tipo(request.getTipo())
                .activo(request.getActivo() != null ? request.getActivo() : true)
                .icono(request.getIcono())
                .descripcion(request.getDescripcion())
                .imagenUrl(request.getImagenUrl())
                .build();
        return repository.save(item);
    }

    @CacheEvict(value = "filtrosActivos", allEntries = true)
    public ItemCatalogo actualizar(Long id, ItemCatalogoRequest request) {
        return repository.findById(id)
                .map(existing -> {
                    existing.setNombre(request.getNombre());
                    existing.setValor(request.getValor());
                    existing.setTipo(request.getTipo());
                    existing.setActivo(request.getActivo() != null ? request.getActivo() : existing.getActivo());
                    existing.setIcono(request.getIcono());
                    existing.setDescripcion(request.getDescripcion());
                    existing.setImagenUrl(request.getImagenUrl());
                    return repository.save(existing);
                }).orElseThrow(() -> new EntityNotFoundException("Item de catálogo con id " + id + " no encontrado"));
    }

    @CacheEvict(value = "filtrosActivos", allEntries = true)
    public void eliminar(Long id) {
        repository.deleteById(id);
    }
}
