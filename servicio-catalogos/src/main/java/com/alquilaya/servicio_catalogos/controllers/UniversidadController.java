package com.alquilaya.servicio_catalogos.controllers;

import com.alquilaya.servicio_catalogos.dto.CampusPrincipalResponse;
import com.alquilaya.servicio_catalogos.dto.UniversidadRequest;
import com.alquilaya.servicio_catalogos.dto.UniversidadResponse;
import com.alquilaya.servicio_catalogos.dto.ZonaPublicaResponse;
import com.alquilaya.servicio_catalogos.dto.ZonaResolucionResponse;
import com.alquilaya.servicio_catalogos.services.UniversidadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@RestController
@RequestMapping("/api/v1/catalogos/universidades")
@RequiredArgsConstructor
public class UniversidadController {

    private final UniversidadService service;

    /** Secreto compartido entre servicios internos (mismo valor que usa el servicio Node). */
    @Value("${internal.api-key:}")
    private String internalApiKey;

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
     * Zonas activas (público): lista plana con geometría para búsqueda/mapa públicos. NO expone la
     * comisión de plataforma; la configuración de negocio viaja solo por el endpoint interno.
     */
    @GetMapping("/zonas/activas")
    public ResponseEntity<List<ZonaPublicaResponse>> zonasActivas() {
        return ResponseEntity.ok(service.listarZonasPublicas());
    }

    /**
     * Zonas activas (INTERNO): igual que el público pero CON la comisión por zona. Lo consume
     * servicio-propiedades vía Feign para resolver la zona de una propiedad y calcular la comisión
     * de cada venta. No pasa por el gateway (Feign resuelve el servicio por Eureka) y se protege con
     * el secreto compartido {@code X-Internal-Key}, no con JWT: propiedades también pide zonas en
     * hilos de background (scheduler de publicación programada) donde no hay JWT de usuario.
     */
    @GetMapping("/zonas/activas/interno")
    public ResponseEntity<List<ZonaResolucionResponse>> zonasActivasInterno(
            @RequestHeader(value = "X-Internal-Key", required = false) String internalKey) {
        if (!claveInternaValida(internalKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(service.listarZonasActivas());
    }

    /**
     * Valida el secreto interno con comparación de tiempo constante ({@link MessageDigest#isEqual}),
     * evitando fugas de información por timing. Fail-closed: si el secreto configurado es null/blank
     * o el header entrante es null, rechaza.
     */
    private boolean claveInternaValida(String entrante) {
        if (internalApiKey == null || internalApiKey.isBlank() || entrante == null) {
            return false;
        }
        return MessageDigest.isEqual(
                internalApiKey.getBytes(StandardCharsets.UTF_8),
                entrante.getBytes(StandardCharsets.UTF_8));
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
