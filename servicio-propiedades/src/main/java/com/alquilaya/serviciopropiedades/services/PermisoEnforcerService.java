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
            System.out.println("🔐 [PERMISO ENFORCER] Authentication: " + (auth != null ? "EXISTS" : "NULL"));
            
            if (auth == null) {
                System.out.println("❌ [PERMISO ENFORCER] Auth es NULL");
                return false;
            }
            
            System.out.println("✅ [PERMISO ENFORCER] Auth no es null");
            System.out.println("   - isAuthenticated(): " + auth.isAuthenticated());
            System.out.println("   - Authorities: " + auth.getAuthorities());
            System.out.println("   - Principal: " + auth.getPrincipal());
            
            if (!auth.isAuthenticated() || auth.getAuthorities().isEmpty()) {
                System.out.println("❌ [PERMISO ENFORCER] Usuario no autenticado o sin authorities");
                return false;
            }

            // Extraer el rol de forma segura del primer authority
            String rol = auth.getAuthorities().stream()
                    .map(a -> a.getAuthority().replace("ROLE_", ""))
                    .findFirst()
                    .orElse("");

            System.out.println("🔍 [PERMISO ENFORCER] Usuario con Rol: '" + rol + "' intentando: '" + funcionalidad + "'");

            if (rol.isEmpty()) {
                System.out.println("❌ [PERMISO ENFORCER] Rol vacío o no detectado.");
                return false;
            }

            // Preguntar al servicio de usuarios
            System.out.println("📞 [PERMISO ENFORCER] Llamando a servicio-usuarios para verificar: " + rol + " -> " + funcionalidad);
            boolean tienePermiso = permisoClient.verificarPermiso(rol, funcionalidad);
            System.out.println("📊 [PERMISO ENFORCER] Resultado: " + (tienePermiso ? "✅ PERMITIDO" : "❌ DENEGADO"));
            
            return tienePermiso;
        } catch (Throwable t) {
            System.err.println("!!! [ERROR CRÍTICO EN PERMISO ENFORCER] " + t.getClass().getSimpleName() + " -> " + t.getMessage());
            t.printStackTrace();
            return false;
        }
    }
}
