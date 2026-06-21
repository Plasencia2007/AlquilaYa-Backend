package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.config.CurrentUserProvider;
import com.alquilaya.serviciopropiedades.dto.CrearResenaArrendadorRequest;
import com.alquilaya.serviciopropiedades.dto.CrearResenaPropiedadRequest;
import com.alquilaya.serviciopropiedades.dto.CrearResenaEstudianteRequest;
import com.alquilaya.serviciopropiedades.dto.ResenaResponseDTO;
import com.alquilaya.serviciopropiedades.dto.ResumenCategoriasDTO;
import com.alquilaya.serviciopropiedades.entities.ResenaArrendador;
import com.alquilaya.serviciopropiedades.entities.ResenaEstudiante;
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

    /** Promedios por sub-categoría (limpieza/ubicación/precio/trato) de una propiedad. */
    @GetMapping("/propiedad/{propiedadId}/resumen")
    public ResponseEntity<ResumenCategoriasDTO> resumenCategorias(@PathVariable Long propiedadId) {
        return ResponseEntity.ok(resenaService.resumenCategorias(propiedadId));
    }

    /** El arrendador dueño responde (o edita/borra con texto vacío) una reseña de su propiedad. */
    @PutMapping("/propiedad/{id}/respuesta")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    public ResponseEntity<ResenaResponseDTO> responderPropiedad(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String respuesta = body != null ? body.get("respuesta") : null;
        return ResponseEntity.ok(
                resenaService.responderResenaPropiedad(id, respuesta, CurrentUserProvider.get()));
    }

    /** Moderación: el admin borra SOLO la respuesta del arrendador (la reseña queda visible). */
    @DeleteMapping("/propiedad/{id}/respuesta")
    @PreAuthorize("@permisoEnforcer.tienePermiso('MODERAR_RESENAS')")
    public ResponseEntity<ResenaResponseDTO> eliminarRespuestaPropiedad(@PathVariable Long id) {
        return ResponseEntity.ok(resenaService.eliminarRespuestaPropiedad(id));
    }

    @GetMapping("/arrendador/{arrendadorId}")
    public ResponseEntity<List<ResenaResponseDTO>> porArrendador(@PathVariable Long arrendadorId) {
        return ResponseEntity.ok(resenaService.listarPorArrendador(arrendadorId));
    }

    @GetMapping("/arrendador/{arrendadorId}/calificacion")
    public ResponseEntity<Map<String, Object>> calificacionArrendador(@PathVariable Long arrendadorId) {
        return ResponseEntity.ok(resenaService.calificacionArrendador(arrendadorId));
    }

    @PostMapping("/estudiante")
    @PreAuthorize("@permisoEnforcer.tienePermiso('RESENAR')")
    public ResponseEntity<ResenaEstudiante> resenarEstudiante(@Valid @RequestBody CrearResenaEstudianteRequest req) {
        return ResponseEntity.ok(resenaService.resenarEstudiante(req, CurrentUserProvider.get()));
    }

    @GetMapping("/estudiante/{estudianteId}")
    public ResponseEntity<List<ResenaEstudiante>> porEstudiante(@PathVariable Long estudianteId) {
        return ResponseEntity.ok(resenaService.listarPorEstudiante(estudianteId));
    }

    @PatchMapping("/{id}/ocultar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('MODERAR_RESENAS')")
    public ResponseEntity<ResenaResponseDTO> ocultar(
            @PathVariable Long id,
            @RequestParam String tipo) {
        return ResponseEntity.ok(resenaService.ocultar(id, tipo));
    }

    /** Listado paginado de reseñas de propiedad (incl. ocultas) para el panel de moderación. */
    @GetMapping("/admin/propiedad")
    @PreAuthorize("@permisoEnforcer.tienePermiso('MODERAR_RESENAS')")
    public ResponseEntity<org.springframework.data.domain.Page<ResenaResponseDTO>> listarPropiedadAdmin(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(resenaService.listarPropiedadAdmin(page, size));
    }

    /** Moderación: oculta (visible=false) o restaura (visible=true) una reseña de propiedad. */
    @PatchMapping("/propiedad/{id}/visibilidad")
    @PreAuthorize("@permisoEnforcer.tienePermiso('MODERAR_RESENAS')")
    public ResponseEntity<ResenaResponseDTO> cambiarVisibilidadPropiedad(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {
        boolean visible = body != null && Boolean.TRUE.equals(body.get("visible"));
        return ResponseEntity.ok(resenaService.cambiarVisibilidadPropiedad(id, visible));
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
