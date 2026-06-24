package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.rbac.FuncionalidadDTO;
import com.alquilaya.serviciousuarios.dto.rbac.RolPersonalizadoDTO;
import com.alquilaya.serviciousuarios.dto.rbac.RolPersonalizadoRequest;
import com.alquilaya.serviciousuarios.services.RbacService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Panel de RBAC dinámico (#32): CRUD de roles personalizados, catálogo de funcionalidades y
 * asignación de roles a usuarios. Todo protegido por el permiso {@code GESTIONAR_SISTEMA}.
 */
@RestController
@RequestMapping("/api/v1/usuarios/rbac")
@RequiredArgsConstructor
public class RbacController {

    private final RbacService rbacService;

    @GetMapping("/funcionalidades")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<List<FuncionalidadDTO>> funcionalidades() {
        return ResponseEntity.ok(rbacService.listarFuncionalidades());
    }

    @GetMapping("/roles")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<List<RolPersonalizadoDTO>> roles() {
        return ResponseEntity.ok(rbacService.listarRoles());
    }

    @PostMapping("/roles")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<RolPersonalizadoDTO> crearRol(@Valid @RequestBody RolPersonalizadoRequest req) {
        return ResponseEntity.ok(rbacService.crear(req));
    }

    @PutMapping("/roles/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<RolPersonalizadoDTO> actualizarRol(
            @PathVariable Long id, @Valid @RequestBody RolPersonalizadoRequest req) {
        return ResponseEntity.ok(rbacService.actualizar(id, req));
    }

    @DeleteMapping("/roles/{id}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<Void> eliminarRol(@PathVariable Long id) {
        rbacService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/usuarios/{usuarioId}/roles")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<List<RolPersonalizadoDTO>> rolesDeUsuario(@PathVariable Long usuarioId) {
        return ResponseEntity.ok(rbacService.rolesDeUsuario(usuarioId));
    }

    @PostMapping("/usuarios/{usuarioId}/roles/{rolId}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<Void> asignar(@PathVariable Long usuarioId, @PathVariable Long rolId) {
        rbacService.asignarRol(usuarioId, rolId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/usuarios/{usuarioId}/roles/{rolId}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<Void> quitar(@PathVariable Long usuarioId, @PathVariable Long rolId) {
        rbacService.quitarRol(usuarioId, rolId);
        return ResponseEntity.noContent().build();
    }
}
