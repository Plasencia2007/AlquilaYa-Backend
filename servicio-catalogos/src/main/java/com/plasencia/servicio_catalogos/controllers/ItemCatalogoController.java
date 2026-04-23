package com.plasencia.servicio_catalogos.controllers;

import com.plasencia.servicio_catalogos.entities.ItemCatalogo;
import com.plasencia.servicio_catalogos.enums.TipoItem;
import com.plasencia.servicio_catalogos.services.ItemCatalogoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/catalogos")
@RequiredArgsConstructor
public class ItemCatalogoController {

    private final ItemCatalogoService service;

    @GetMapping("/filtros/activos")
    public ResponseEntity<Map<TipoItem, List<ItemCatalogo>>> obtenerFiltrosActivos() {
        return ResponseEntity.ok(service.obtenerFiltrosActivos());
    }

    @GetMapping("/filtros/tipo/{tipo}")
    public ResponseEntity<List<ItemCatalogo>> obtenerPorTipo(@PathVariable TipoItem tipo) {
        return ResponseEntity.ok(service.listarPorTipo(tipo));
    }

    @GetMapping("/admin/filtros")
    public ResponseEntity<List<ItemCatalogo>> listarTodo() {
        return ResponseEntity.ok(service.listarTodo());
    }

    @PostMapping("/admin/filtros")
    public ResponseEntity<ItemCatalogo> crear(@RequestBody ItemCatalogo item) {
        return ResponseEntity.ok(service.guardar(item));
    }

    @PutMapping("/admin/filtros/{id}")
    public ResponseEntity<ItemCatalogo> actualizar(@PathVariable Long id, @RequestBody ItemCatalogo item) {
        return ResponseEntity.ok(service.actualizar(id, item));
    }

    @DeleteMapping("/admin/filtros/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
