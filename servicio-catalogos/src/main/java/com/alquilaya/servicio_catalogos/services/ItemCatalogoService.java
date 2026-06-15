package com.alquilaya.servicio_catalogos.services;

import com.alquilaya.servicio_catalogos.entities.ItemCatalogo;
import com.alquilaya.servicio_catalogos.enums.TipoItem;
import com.alquilaya.servicio_catalogos.repositories.ItemCatalogoRepository;
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
    public ItemCatalogo guardar(ItemCatalogo item) {
        return repository.save(item);
    }

    @CacheEvict(value = "filtrosActivos", allEntries = true)
    public ItemCatalogo actualizar(Long id, ItemCatalogo item) {
        return repository.findById(id)
                .map(existing -> {
                    existing.setNombre(item.getNombre());
                    existing.setValor(item.getValor());
                    existing.setTipo(item.getTipo());
                    existing.setActivo(item.getActivo());
                    existing.setIcono(item.getIcono());
                    existing.setDescripcion(item.getDescripcion());
                    return repository.save(existing);
                }).orElseThrow(() -> new RuntimeException("Item no encontrado"));
    }

    @CacheEvict(value = "filtrosActivos", allEntries = true)
    public void eliminar(Long id) {
        repository.deleteById(id);
    }
}
