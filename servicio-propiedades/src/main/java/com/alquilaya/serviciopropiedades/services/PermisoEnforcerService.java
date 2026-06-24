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

            // Chequeo EFECTIVO por usuario (rol base ∪ roles personalizados, #32): el JWT se
            // propaga a servicio-usuarios, que resuelve al usuario y sus permisos efectivos.
            boolean tienePermiso = verificarPermisoResiliente(funcionalidad).join();
            log.debug("[PERMISO] funcionalidad={} resultado={}", funcionalidad, tienePermiso);
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
    public CompletableFuture<Boolean> verificarPermisoResiliente(String funcionalidad) {
        log.debug("[Resilience4j] Verificando permiso efectivo funcionalidad={}", funcionalidad);
        var attrs = RequestContextHolder.getRequestAttributes();
        return CompletableFuture.supplyAsync(() -> {
            RequestContextHolder.setRequestAttributes(attrs);
            try {
                return permisoClient.verificarPermisoEfectivo(funcionalidad);
            } finally {
                RequestContextHolder.resetRequestAttributes();
            }
        });
    }

    @SuppressWarnings("unused")
    private CompletableFuture<Boolean> fallbackVerificarPermiso(String funcionalidad, Throwable t) {
        log.error("[FALLBACK] verificarPermisoEfectivo(funcionalidad={}) — {}: {}. Denegando por defecto (fail-safe).",
                funcionalidad, t.getClass().getSimpleName(), t.getMessage());
        return CompletableFuture.completedFuture(false);
    }
}
