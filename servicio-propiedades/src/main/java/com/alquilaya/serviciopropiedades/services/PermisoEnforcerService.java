package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.clients.PermisoClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Slf4j
@Service("permisoEnforcer")
@RequiredArgsConstructor
public class PermisoEnforcerService {

    private final PermisoClient permisoClient;

    public boolean tienePermiso(String funcionalidad) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();

            if (auth == null || !auth.isAuthenticated() || auth.getAuthorities().isEmpty()) {
                log.warn("[PERMISO] Sin autenticación para funcionalidad: {}", funcionalidad);
                return false;
            }

            String rol = auth.getAuthorities().stream()
                    .map(a -> a.getAuthority().replace("ROLE_", ""))
                    .findFirst()
                    .orElse("");

            if (rol.isEmpty()) {
                log.warn("[PERMISO] Rol vacío en token para funcionalidad: {}", funcionalidad);
                return false;
            }

            boolean tienePermiso = permisoClient.verificarPermiso(rol, funcionalidad);
            log.debug("[PERMISO] rol={} funcionalidad={} resultado={}", rol, funcionalidad, tienePermiso);
            return tienePermiso;
        } catch (Throwable t) {
            log.error("[PERMISO] Error verificando permiso '{}': {}", funcionalidad, t.getMessage());
            return false;
        }
    }
}
