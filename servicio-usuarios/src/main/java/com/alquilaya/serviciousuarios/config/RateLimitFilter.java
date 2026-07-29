package com.alquilaya.serviciousuarios.config;

import com.alquilaya.serviciousuarios.util.ClientIpResolver;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
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
            Map.entry("/api/v1/usuarios/auth/resend-email-verification", limit(3,  Duration.ofMinutes(5))),
            // Alta de alerta de nuevas propiedades (#99/#492): público y dispara correo de
            // confirmación → límite estricto por IP contra email-bombing (además del límite
            // por correo en Redis dentro de SuscripcionAlertaService).
            Map.entry("/api/v1/usuarios/alertas",                       limit(3,  Duration.ofMinutes(5))),
            // Ingesta de telemetría de analítica CLIENTE (ítem 455): público y persiste en BD.
            // Límite más laxo que los anteriores (no dispara correo ni es dato sensible) pero
            // igual necesita anti-abuso: el frontend manda a lo sumo un batch cada ~10s por
            // pestaña, así que 20/min por IP da margen a varias pestañas sin abrir la puerta a
            // un flood que infle la tabla eventos_analytics.
            Map.entry("/api/v1/usuarios/analytics/eventos",             limit(20, Duration.ofMinutes(1)))
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

    // S8: misma resolución de IP (respeta rate-limit.trusted-hops) que usa AuthController
    // para registrar LoginAttempt/alertas — un único lugar evita que se desincronicen.
    private final ClientIpResolver clientIpResolver;

    public RateLimitFilter(ClientIpResolver clientIpResolver) {
        this.clientIpResolver = clientIpResolver;
    }

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

        String clientIp = clientIpResolver.resolve(request);
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
}
