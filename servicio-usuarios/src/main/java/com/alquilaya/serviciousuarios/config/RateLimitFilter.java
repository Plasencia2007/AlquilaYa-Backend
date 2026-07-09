package com.alquilaya.serviciousuarios.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting por IP para endpoints sensibles de autenticación.
 * Implementación en memoria (Bucket4j) — suficiente para un solo nodo. Con múltiples
 * réplicas migrar a bucket4j-redis o similar.
 */
@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    // POST paths protegidos con su bandwidth (requests / ventana).
    // Los que ENVÍAN correo (forgot-password, resend-email-verification) van con límite
    // estricto para evitar email-bombing a una víctima o quemar el cupo de Gmail.
    private static final Map<String, Bandwidth> LIMITS = Map.ofEntries(
            Map.entry("/api/v1/usuarios/auth/login",                    limit(5,  Duration.ofMinutes(1))),
            Map.entry("/api/v1/usuarios/auth/login-admin",              limit(5,  Duration.ofMinutes(1))),
            Map.entry("/api/v1/usuarios/auth/register",                 limit(3,  Duration.ofMinutes(1))),
            Map.entry("/api/v1/usuarios/auth/register-admin",           limit(2,  Duration.ofMinutes(1))),
            Map.entry("/api/v1/usuarios/auth/verify-otp",               limit(10, Duration.ofMinutes(1))),
            Map.entry("/api/v1/usuarios/auth/verify-email",             limit(10, Duration.ofMinutes(1))),
            Map.entry("/api/v1/usuarios/auth/forgot-password",          limit(3,  Duration.ofMinutes(5))),
            Map.entry("/api/v1/usuarios/auth/resend-email-verification", limit(3,  Duration.ofMinutes(5)))
    );

    private static Bandwidth limit(long capacity, Duration refillPeriod) {
        return Bandwidth.builder()
                .capacity(capacity)
                .refillGreedy(capacity, refillPeriod)
                .build();
    }

    private static final List<String> PROTECTED_PATHS = List.copyOf(LIMITS.keySet());

    // Clave = "path|clientIp". Buckets viven en memoria mientras la JVM corra.
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    /**
     * Nº de proxies de confianza delante de este servicio que anexan a X-Forwarded-For (S8).
     * Default 0 → usa la IP del socket (no falsificable). En prod usuarios sólo es accesible
     * vía el gateway (red interna), así que el vector de spoofing externo real es el gateway.
     */
    @Value("${rate-limit.trusted-hops:0}")
    private int trustedProxyHops;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        String matched = PROTECTED_PATHS.stream()
                .filter(path::equals)
                .findFirst()
                .orElse(null);
        if (matched == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = resolveClientIp(request);
        String key = matched + "|" + clientIp;
        Bucket bucket = buckets.computeIfAbsent(key, k ->
                Bucket.builder().addLimit(LIMITS.get(matched)).build());

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            log.warn("Rate limit excedido: path={} ip={}", matched, clientIp);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", "60");
            response.getWriter().write(
                    "{\"error\":\"Demasiadas solicitudes. Intenta nuevamente en un minuto.\"}");
        }
    }

    // S8: resistente a X-Forwarded-For falsificado. Cuenta desde la DERECHA saltando los
    // proxies de confianza; las entradas falsas del atacante quedan a la izquierda y nunca se
    // eligen. Cadena corta (dev / spoof directo) → cae a getRemoteAddr() (IP del socket).
    private String resolveClientIp(HttpServletRequest request) {
        if (trustedProxyHops > 0) {
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                String[] parts = xff.split(",");
                int idx = parts.length - 1 - trustedProxyHops;
                if (idx >= 0) {
                    String ip = parts[idx].trim();
                    if (!ip.isBlank()) {
                        return ip;
                    }
                }
            }
        }
        return request.getRemoteAddr();
    }
}
