package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.enums.Rol;
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

            if (rolStr.isEmpty()) {
                log.warn("[PERMISO] Rol no encontrado en el token para funcionalidad: {}", funcionalidad);
                return false;
            }

            Rol rol = Rol.valueOf(rolStr.toUpperCase());
            boolean tienePermiso = permisoService.tienePermiso(rol, funcionalidad);
            
            log.debug("[PERMISO] rol={} funcionalidad={} resultado={}", rol, funcionalidad, tienePermiso);
            return tienePermiso;
        } catch (Exception e) {
            log.error("[PERMISO] Error verificando permiso '{}': {}", funcionalidad, e.getMessage());
            return false;
        }
    }
}
