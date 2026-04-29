package com.alquilaya.api_gateway.filter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiter global para el api-gateway (MVC servlet, no reactivo).
 *
 * <p>Algoritmo: ventana deslizante de 60 segundos por IP.
 * Si una IP supera {@value #MAX_REQUESTS_PER_MINUTE} peticiones/minuto
 * se responde con HTTP 429 Too Many Requests.
 *
 * <p>Registrado en {@link com.alquilaya.api_gateway.config.RateLimitConfig}
 * como interceptor de Spring MVC.
 *
 * <p>Notas de implementación:
 * <ul>
 *   <li>Se usa {@link ConcurrentHashMap} con {@link ArrayDeque} de timestamps (ms).
 *   <li>La limpieza de entradas antiguas se hace en cada petición de la misma IP
 *       (lazy cleanup), lo que es adecuado para un gateway de tráfico moderado.
 *   <li>Para escenarios de alto tráfico o despliegue multi-instancia, considerar
 *       sustituir por Redis + Bucket4j.
 * </ul>
 */
@Component
public class RateLimitGlobalFilter implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(RateLimitGlobalFilter.class);

    /** Máximo de peticiones permitidas por IP en una ventana de 60 segundos. */
    static final int MAX_REQUESTS_PER_MINUTE = 100;

    /** Tamaño de la ventana deslizante en milisegundos. */
    private static final long WINDOW_MS = 60_000L;

    /**
     * Mapa concurrente: IP → cola de timestamps (ms) de peticiones recientes.
     * Las entradas antiguas se limpian lazily en cada petición de la misma IP.
     */
    private final ConcurrentHashMap<String, Deque<Long>> requestTimestamps = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull Object handler
    ) throws Exception {

        String ip = resolveClientIp(request);
        long now = System.currentTimeMillis();
        long windowStart = now - WINDOW_MS;

        // computeIfAbsent garantiza que siempre haya una deque para la IP
        Deque<Long> timestamps = requestTimestamps.computeIfAbsent(ip, k -> new ArrayDeque<>());

        synchronized (timestamps) {
            // Eliminar timestamps fuera de la ventana (lazy cleanup)
            while (!timestamps.isEmpty() && timestamps.peekFirst() <= windowStart) {
                timestamps.pollFirst();
            }

            if (timestamps.size() >= MAX_REQUESTS_PER_MINUTE) {
                log.warn("Rate limit excedido para IP={} ({} req/min)", ip, timestamps.size());
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType("application/json");
                response.getWriter().write(
                        "{\"error\":\"Too Many Requests\","
                        + "\"mensaje\":\"Has superado el límite de " + MAX_REQUESTS_PER_MINUTE
                        + " peticiones por minuto. Intenta de nuevo más tarde.\","
                        + "\"status\":429}"
                );
                return false;
            }

            timestamps.addLast(now);
        }

        return true;
    }

    /**
     * Extrae la IP real del cliente.
     * Prioriza el header {@code X-Forwarded-For} (primer valor) para funcionar
     * correctamente detrás de proxies/load balancers/ngrok.
     */
    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            // X-Forwarded-For puede ser "client, proxy1, proxy2" — tomar el primero
            int comma = xff.indexOf(',');
            return (comma > 0 ? xff.substring(0, comma) : xff).trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
