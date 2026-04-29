package com.alquilaya.servicio_catalogos.controllers;

import com.alquilaya.servicio_catalogos.dto.CarreraRequest;
import com.alquilaya.servicio_catalogos.dto.CarreraResponse;
import com.alquilaya.servicio_catalogos.services.CarreraService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/catalogos/carreras")
@RequiredArgsConstructor
public class CarreraController {

    private final CarreraService service;

    @GetMapping
    public ResponseEntity<List<CarreraResponse>> listarActivas() {
        List<CarreraResponse> data = service.listarActivas().stream()
                .map(CarreraResponse::from)
                .toList();
        return ResponseEntity.ok(data);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CarreraResponse> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(CarreraResponse.from(service.obtener(id)));
    }

    @GetMapping("/existe/{id}")
    public ResponseEntity<Boolean> existe(@PathVariable Long id) {
        return ResponseEntity.ok(service.existeActiva(id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin")
    public ResponseEntity<List<CarreraResponse>> listarTodas() {
        List<CarreraResponse> data = service.listarTodas().stream()
                .map(CarreraResponse::from)
                .toList();
        return ResponseEntity.ok(data);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/admin")
    public ResponseEntity<CarreraResponse> crear(@Valid @RequestBody CarreraRequest request) {
        CarreraResponse creada = CarreraResponse.from(service.crear(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(creada);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/admin/{id}")
    public ResponseEntity<CarreraResponse> actualizar(@PathVariable Long id,
                                                      @Valid @RequestBody CarreraRequest request) {
        return ResponseEntity.ok(CarreraResponse.from(service.actualizar(id, request)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/admin/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
