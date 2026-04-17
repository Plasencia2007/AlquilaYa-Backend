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

            System.out.println("🔍 [DEBUG PERMISOS] Usuario detectado con Rol: " + rol + " intentando: " + funcionalidad);

            if (rol.isEmpty()) {
                System.out.println("❌ [DEBUG PERMISOS] Permiso denegado: Rol vacío o no detectado.");
                return false;
            }

            // Preguntar al servicio de usuarios
            boolean tienePermiso = permisoClient.verificarPermiso(rol, funcionalidad);
            System.out.println("📊 [DEBUG PERMISOS] Resultado de verificación en servicio-usuarios: " + tienePermiso);
            
            return tienePermiso;
        } catch (Throwable t) {
            // Loguear el error crítico y denegar por seguridad en lugar de lanzar 500
            System.err.println("!!! [ERROR CRÍTICO] FALLA EN COMUNICACIÓN INTER-SERVICIOS: " + t.getClass().getSimpleName() + " -> " + t.getMessage());
            return false;
        }
    }
}
