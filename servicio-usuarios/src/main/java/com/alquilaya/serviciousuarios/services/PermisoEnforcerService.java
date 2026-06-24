package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.enums.Rol;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Slf4j
@Service("permisoEnforcer")
@RequiredArgsConstructor
public class PermisoEnforcerService {

    private final PermisoService permisoService;
    private final UsuarioRepository usuarioRepository;
    private final RbacService rbacService;

    public boolean tienePermiso(String funcionalidad) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();

            if (auth == null || !auth.isAuthenticated()) {
                log.warn("[PERMISO] Usuario no autenticado para funcionalidad: {}", funcionalidad);
                return false;
            }

            String rolStr = auth.getAuthorities().stream()
                    .map(a -> a.getAuthority().replace("ROLE_", ""))
                    .findFirst()
                    .orElse("");

            // 1) Permiso por ROL BASE (matriz Permiso por enum Rol) — camino rápido, sin tocar BD extra.
            if (!rolStr.isEmpty()) {
                try {
                    Rol rol = Rol.valueOf(rolStr.toUpperCase());
                    if (permisoService.tienePermiso(rol, funcionalidad)) {
                        log.debug("[PERMISO] rol-base={} funcionalidad={} → concedido", rol, funcionalidad);
                        return true;
                    }
                } catch (IllegalArgumentException ignored) {
                    // El rol del token no mapea al enum; seguimos con RBAC dinámico.
                }
            }

            // 2) RBAC dinámico (#32): permisos de los roles personalizados asignados al usuario.
            String correo = auth.getName();
            boolean porRolPersonalizado = usuarioRepository.findByCorreo(correo)
                    .map(u -> rbacService.funcionalidadesPersonalizadas(u.getId()).contains(funcionalidad))
                    .orElse(false);

            log.debug("[PERMISO] funcionalidad={} viaRolPersonalizado={}", funcionalidad, porRolPersonalizado);
            return porRolPersonalizado;
        } catch (Exception e) {
            log.error("[PERMISO] Error verificando permiso '{}': {}", funcionalidad, e.getMessage());
            return false;
        }
    }

    public boolean esPropioUsuario(Long id) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) return false;
            String correo = auth.getName();
            return usuarioRepository.findByCorreo(correo)
                    .map(u -> u.getId().equals(id))
                    .orElse(false);
        } catch (Exception e) {
            log.error("[PERMISO] Error verificando propietario para id={}: {}", id, e.getMessage());
            return false;
        }
    }
}
