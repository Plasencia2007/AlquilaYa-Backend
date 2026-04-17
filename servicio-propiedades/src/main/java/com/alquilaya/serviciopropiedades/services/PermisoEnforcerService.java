package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.clients.PermisoClient;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service("permisoEnforcer")
@RequiredArgsConstructor
public class PermisoEnforcerService {

    private final PermisoClient permisoClient;

    public boolean tienePermiso(String funcionalidad) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || auth.getAuthorities().isEmpty()) {
                return false;
            }

            // Extraer el rol de forma segura del primer authority
            String rol = auth.getAuthorities().stream()
                    .map(a -> a.getAuthority().replace("ROLE_", ""))
                    .findFirst()
                    .orElse("");

            if (rol.isEmpty()) return false;

            // Preguntar al servicio de usuarios
            return permisoClient.verificarPermiso(rol, funcionalidad);
        } catch (Throwable t) {
            // Loguear el error crítico y denegar por seguridad en lugar de lanzar 500
            System.err.println("!!! ERROR CRÍTICO EN PERMISO ENFORCER: " + t.getClass().getName() + " -> " + t.getMessage());
            t.printStackTrace();
            return false;
        }
    }
}
