package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.config.CurrentUser;
import com.alquilaya.serviciopropiedades.config.CurrentUserProvider;
import com.alquilaya.serviciopropiedades.dto.HabitacionRequest;
import com.alquilaya.serviciopropiedades.dto.HabitacionResponse;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.services.HabitacionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * CRUD de habitaciones de una propiedad gestionada por habitaciones. El listado es público
 * (la ficha del estudiante lo usa); las mutaciones son del dueño de la propiedad o ADMIN.
 */
@RestController
@RequestMapping("/api/v1/propiedades/{propiedadId}/habitaciones")
@RequiredArgsConstructor
public class HabitacionController {

    private final HabitacionService habitacionService;
    private final PropiedadRepository propiedadRepository;

    @GetMapping
    public List<HabitacionResponse> listar(@PathVariable Long propiedadId) {
        return habitacionService.listar(propiedadId);
    }

    @PostMapping
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<HabitacionResponse> crear(@PathVariable Long propiedadId,
                                                    @Valid @RequestBody HabitacionRequest req) {
        verificarPropietarioOAdmin(propiedadId);
        return ResponseEntity.status(HttpStatus.CREATED).body(habitacionService.crear(propiedadId, req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<HabitacionResponse> actualizar(@PathVariable Long propiedadId,
                                                         @PathVariable Long id,
                                                         @Valid @RequestBody HabitacionRequest req) {
        verificarPropietarioOAdmin(propiedadId);
        return ResponseEntity.ok(habitacionService.actualizar(propiedadId, id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('PUBLICAR_CUARTOS')")
    @CacheEvict(value = "propiedades:listado", allEntries = true)
    public ResponseEntity<Void> eliminar(@PathVariable Long propiedadId, @PathVariable Long id) {
        verificarPropietarioOAdmin(propiedadId);
        habitacionService.eliminar(propiedadId, id);
        return ResponseEntity.noContent().build();
    }

    private void verificarPropietarioOAdmin(Long propiedadId) {
        Propiedad p = propiedadRepository.findById(propiedadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Propiedad no encontrada"));
        CurrentUser cu = CurrentUserProvider.get();
        if (cu == null) {
            throw new AccessDeniedException("No autenticado.");
        }
        if ("ADMIN".equalsIgnoreCase(cu.getRol())) {
            return;
        }
        if (cu.getPerfilId() == null || !cu.getPerfilId().equals(p.getArrendadorId())) {
            throw new AccessDeniedException("No puedes gestionar habitaciones de una propiedad que no es tuya.");
        }
    }
}
