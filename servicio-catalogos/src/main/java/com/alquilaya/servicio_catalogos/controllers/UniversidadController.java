package com.alquilaya.servicio_catalogos.controllers;

import com.alquilaya.servicio_catalogos.dto.CampusPrincipalResponse;
import com.alquilaya.servicio_catalogos.dto.UniversidadRequest;
import com.alquilaya.servicio_catalogos.dto.UniversidadResponse;
import com.alquilaya.servicio_catalogos.dto.ZonaResolucionResponse;
import com.alquilaya.servicio_catalogos.services.UniversidadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/catalogos/universidades")
@RequiredArgsConstructor
public class UniversidadController {

    private final UniversidadService service;

    @GetMapping
    public ResponseEntity<List<UniversidadResponse>> listarActivas() {
        return ResponseEntity.ok(service.listarActivas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UniversidadResponse> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(service.obtener(id));
    }

    @GetMapping("/existe/{id}")
    public ResponseEntity<Boolean> existe(@PathVariable Long id) {
        return ResponseEntity.ok(service.existeActiva(id));
    }

    /** Campus principal (público): coords + radio que otros servicios usan como ancla de cercanía. */
    @GetMapping("/principal")
    public ResponseEntity<CampusPrincipalResponse> principal() {
        CampusPrincipalResponse campus = service.obtenerPrincipal();
        return campus == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(campus);
    }

    /**
     * Zonas activas (público): lista plana con geometría que servicio-propiedades usa para
     * resolver en qué zona cae una propiedad al publicarla.
     */
    @GetMapping("/zonas/activas")
    public ResponseEntity<List<ZonaResolucionResponse>> zonasActivas() {
        return ResponseEntity.ok(service.listarZonasActivas());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin")
    public ResponseEntity<List<UniversidadResponse>> listarTodas() {
        return ResponseEntity.ok(service.listarTodas());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/admin")
    public ResponseEntity<UniversidadResponse> crear(@Valid @RequestBody UniversidadRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/admin/{id}")
    public ResponseEntity<UniversidadResponse> actualizar(@PathVariable Long id,
                                                          @Valid @RequestBody UniversidadRequest request) {
        return ResponseEntity.ok(service.actualizar(id, request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/admin/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
