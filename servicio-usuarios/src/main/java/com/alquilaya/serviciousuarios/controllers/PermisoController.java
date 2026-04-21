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

@RestController
@RequestMapping("/api/v1/usuarios/permisos")
@RequiredArgsConstructor
@Validated
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
            @RequestParam @NotBlank(message = "El rol es obligatorio") String rol,
            @RequestParam @NotBlank(message = "La funcionalidad es obligatoria") String funcionalidad
    ) {
        // El handler global atrapará IllegalArgumentException si el rol no existe
        Rol enumRol = Rol.valueOf(rol.toUpperCase());
        return ResponseEntity.ok(permisoService.tienePermiso(enumRol, funcionalidad));
    }
}
