package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.entities.Permiso;
import com.alquilaya.serviciousuarios.services.PermisoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/usuarios/permisos")
@RequiredArgsConstructor
public class PermisoController {

    private final PermisoService permisoService;

    @GetMapping
    public ResponseEntity<List<Permiso>> obtenerTodos() {
        return ResponseEntity.ok(permisoService.obtenerTodos());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Permiso> actualizarPermiso(
            @PathVariable Long id,
            @RequestParam boolean habilitado
    ) {
        return ResponseEntity.ok(permisoService.actualizarEstado(id, habilitado));
    }

    @GetMapping("/check")
    public ResponseEntity<Boolean> verificarPermiso(
            @RequestParam String rol,
            @RequestParam String funcionalidad
    ) {
        try {
            com.alquilaya.serviciousuarios.enums.Rol enumRol = com.alquilaya.serviciousuarios.enums.Rol.valueOf(rol.toUpperCase());
            return ResponseEntity.ok(permisoService.tienePermiso(enumRol, funcionalidad));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(false);
        }
    }
}
