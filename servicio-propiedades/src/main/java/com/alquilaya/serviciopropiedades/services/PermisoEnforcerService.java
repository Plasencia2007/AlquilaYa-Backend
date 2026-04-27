package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.clients.PermisoClient;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;

import java.util.concurrent.CompletableFuture;

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

            boolean tienePermiso = verificarPermisoResiliente(rol, funcionalidad).join();
            log.debug("[PERMISO] rol={} funcionalidad={} resultado={}", rol, funcionalidad, tienePermiso);
            return tienePermiso;
        } catch (Throwable t) {
            log.error("[PERMISO] Error verificando permiso '{}': {}", funcionalidad, t.getMessage());
            return false;
        }
    }

    @TimeLimiter(name = "verificarPermisoCB")
    @CircuitBreaker(name = "verificarPermisoCB", fallbackMethod = "fallbackVerificarPermiso")
    @Retry(name = "verificarPermisoCB")
    @Bulkhead(name = "verificarPermisoCB", type = Bulkhead.Type.SEMAPHORE)
    public CompletableFuture<Boolean> verificarPermisoResiliente(String rol, String funcionalidad) {
        log.info("[Resilience4j] Verificando permiso rol={} funcionalidad={}", rol, funcionalidad);
        var attrs = RequestContextHolder.getRequestAttributes();
        return CompletableFuture.supplyAsync(() -> {
            RequestContextHolder.setRequestAttributes(attrs);
            try {
                return permisoClient.verificarPermiso(rol, funcionalidad);
            } finally {
                RequestContextHolder.resetRequestAttributes();
            }
        });
    }

    @SuppressWarnings("unused")
    private CompletableFuture<Boolean> fallbackVerificarPermiso(String rol, String funcionalidad, Throwable t) {
        log.error("[FALLBACK] verificarPermiso(rol={}, funcionalidad={}) — {}: {}. Denegando por defecto (fail-safe).",
                rol, funcionalidad, t.getClass().getSimpleName(), t.getMessage());
        return CompletableFuture.completedFuture(false);
    }
}
