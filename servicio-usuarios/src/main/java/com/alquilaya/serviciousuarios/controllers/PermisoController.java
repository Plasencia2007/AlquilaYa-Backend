package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.entities.Permiso;
import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import com.alquilaya.serviciousuarios.services.PermisoService;
import com.alquilaya.serviciousuarios.services.RbacService;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/usuarios/permisos")
@RequiredArgsConstructor
@Validated
public class PermisoController {

    private final PermisoService permisoService;
    private final RbacService rbacService;
    private final UsuarioRepository usuarioRepository;

    /**
     * Permisos efectivos del usuario autenticado (rol base ∪ roles personalizados, #32).
     * Lo usa el frontend para mostrar/ocultar acciones del panel.
     */
    @GetMapping("/mios")
    public ResponseEntity<Set<String>> misPermisos() {
        String correo = SecurityContextHolder.getContext().getAuthentication().getName();
        return usuarioRepository.findByCorreo(correo)
                .map(u -> ResponseEntity.ok(rbacService.permisosEfectivos(u.getId(), u.getRol())))
                .orElseGet(() -> ResponseEntity.ok(Set.of()));
    }

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

    /**
     * Chequeo de permiso EFECTIVO del usuario autenticado (rol base ∪ roles personalizados, #32).
     * Lo usan otros microservicios (vía Feign con el JWT propagado) para que sus endpoints
     * honren los roles personalizados, no solo el rol base.
     */
    @GetMapping("/check-mio")
    public ResponseEntity<Boolean> verificarMio(
            @RequestParam @NotBlank(message = "La funcionalidad es obligatoria") String funcionalidad) {
        String correo = SecurityContextHolder.getContext().getAuthentication().getName();
        boolean tiene = usuarioRepository.findByCorreo(correo)
                .map(u -> rbacService.permisosEfectivos(u.getId(), u.getRol()).contains(funcionalidad))
                .orElse(false);
        return ResponseEntity.ok(tiene);
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
