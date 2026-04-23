package com.plasencia.servicio_catalogos.services;

import com.plasencia.servicio_catalogos.entities.ItemCatalogo;
import com.plasencia.servicio_catalogos.enums.TipoItem;
import com.plasencia.servicio_catalogos.repositories.ItemCatalogoRepository;
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
    public Map<TipoItem, List<ItemCatalogo>> obtenerFiltrosActivos() {
        return repository.findByActivoTrue().stream()
                .collect(Collectors.groupingBy(ItemCatalogo::getTipo));
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
