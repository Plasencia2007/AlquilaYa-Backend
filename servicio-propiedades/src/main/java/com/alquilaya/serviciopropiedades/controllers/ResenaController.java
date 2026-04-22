package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.config.CurrentUserProvider;
import com.alquilaya.serviciopropiedades.dto.CrearResenaArrendadorRequest;
import com.alquilaya.serviciopropiedades.dto.CrearResenaPropiedadRequest;
import com.alquilaya.serviciopropiedades.dto.ResenaResponseDTO;
import com.alquilaya.serviciopropiedades.entities.ResenaArrendador;
import com.alquilaya.serviciopropiedades.entities.ResenaPropiedad;
import com.alquilaya.serviciopropiedades.services.ResenaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/resenas")
@RequiredArgsConstructor
public class ResenaController {

    private final ResenaService resenaService;

    @PostMapping("/propiedad")
    @PreAuthorize("@permisoEnforcer.tienePermiso('RESENAR')")
    public ResponseEntity<ResenaPropiedad> resenarPropiedad(@Valid @RequestBody CrearResenaPropiedadRequest req) {
        return ResponseEntity.ok(resenaService.resenarPropiedad(req, CurrentUserProvider.get()));
    }

    @PostMapping("/arrendador")
    @PreAuthorize("@permisoEnforcer.tienePermiso('RESENAR')")
    public ResponseEntity<ResenaArrendador> resenarArrendador(@Valid @RequestBody CrearResenaArrendadorRequest req) {
        return ResponseEntity.ok(resenaService.resenarArrendador(req, CurrentUserProvider.get()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> obtenerPorId(@PathVariable Long id, @RequestParam String tipo) {
        return ResponseEntity.ok(resenaService.obtenerPorId(id, tipo));
    }

    @GetMapping("/propiedad/{propiedadId}")
    public ResponseEntity<List<ResenaResponseDTO>> porPropiedad(@PathVariable Long propiedadId) {
        return ResponseEntity.ok(resenaService.listarPorPropiedad(propiedadId));
    }

    @GetMapping("/arrendador/{arrendadorId}")
    public ResponseEntity<List<ResenaResponseDTO>> porArrendador(@PathVariable Long arrendadorId) {
        return ResponseEntity.ok(resenaService.listarPorArrendador(arrendadorId));
    }

    @GetMapping("/arrendador/{arrendadorId}/calificacion")
    public ResponseEntity<Map<String, Object>> calificacionArrendador(@PathVariable Long arrendadorId) {
        return ResponseEntity.ok(resenaService.calificacionArrendador(arrendadorId));
    }

    @PatchMapping("/{id}/ocultar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('MODERAR_RESENAS')")
    public ResponseEntity<ResenaResponseDTO> ocultar(
            @PathVariable Long id,
            @RequestParam String tipo) {
        return ResponseEntity.ok(resenaService.ocultar(id, tipo));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('MODERAR_RESENAS')")
    public ResponseEntity<Void> eliminar(
            @PathVariable Long id,
            @RequestParam String tipo) {
        resenaService.eliminarResena(id, tipo);
        return ResponseEntity.noContent().build();
    }
}
