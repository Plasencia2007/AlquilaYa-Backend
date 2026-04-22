package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.entities.Permiso;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.services.PermisoService;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/usuarios/permisos")
@RequiredArgsConstructor
@Validated
public class PermisoController {

    private final PermisoService permisoService;

    @GetMapping
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<List<Permiso>> obtenerTodos() {
        return ResponseEntity.ok(permisoService.obtenerTodos());
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<Permiso> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(permisoService.obtenerPorId(id));
    }

    @PostMapping
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<Permiso> crearPermiso(@RequestBody Permiso permiso) {
        return ResponseEntity.ok(permisoService.crearPermiso(permiso));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<Permiso> actualizarPermiso(
            @PathVariable Long id,
            @RequestParam boolean habilitado
    ) {
        return ResponseEntity.ok(permisoService.actualizarEstado(id, habilitado));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<Void> eliminarPermiso(@PathVariable Long id) {
        permisoService.eliminarPermiso(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/check")
    public ResponseEntity<Boolean> verificarPermiso(
            @RequestParam @NotBlank(message = "El rol es obligatorio") String rol,
            @RequestParam @NotBlank(message = "La funcionalidad es obligatoria") String funcionalidad
    ) {
        Rol enumRol = Rol.valueOf(rol.toUpperCase());
        return ResponseEntity.ok(permisoService.tienePermiso(enumRol, funcionalidad));
    }
}
