package com.alquilaya.api_gateway.filter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Rate limiter global distribuido para el api-gateway (MVC servlet, no reactivo).
 *
 * <p>Algoritmo principal: <b>fixed window counter en Redis</b>.
 * Para cada IP cliente, se incrementa atómicamente un contador asociado a la
 * ventana actual (epochSecond / WINDOW_SECONDS). Si el contador supera
 * {@value #MAX_REQUESTS_PER_MINUTE}, se responde HTTP 429.
 *
 * <p>Key Redis: {@code gateway:ratelimit:ip:<ip>:<windowStart>}.
 * El TTL es 2× la ventana para tolerar relojes ligeramente desincronizados
 * entre réplicas del gateway.
 *
 * <p><b>Graceful degradation:</b> si Redis no responde, se hace fallback al
 * algoritmo in-memory previo basado en {@link ConcurrentHashMap} +
 * {@link ArrayDeque} de timestamps. En modo degradado el límite NO es
 * coherente entre réplicas (cada instancia tiene su propio contador),
 * pero no se bloquea tráfico legítimo.
 *
 * <p>Registrado en {@link com.alquilaya.api_gateway.config.RateLimitConfig}
 * como interceptor de Spring MVC.
 */
@Component
public class RateLimitGlobalFilter implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(RateLimitGlobalFilter.class);

    /** Máximo de peticiones permitidas por IP en una ventana de 60 segundos. */
    static final int MAX_REQUESTS_PER_MINUTE = 100;

    /** Tamaño de la ventana en segundos. */
    private static final long WINDOW_SECONDS = 60L;

    /** TTL en Redis: 2× la ventana, para safety. */
    private static final Duration REDIS_TTL = Duration.ofSeconds(WINDOW_SECONDS * 2);

    /** Prefijo de keys en Redis (aislamiento del gateway). */
    private static final String KEY_PREFIX = "gateway:ratelimit:ip:";

    /** Tamaño de la ventana deslizante in-memory en ms (modo fallback). */
    private static final long WINDOW_MS = WINDOW_SECONDS * 1000L;

    /** Cliente Redis (opcional: puede no estar disponible en algunos perfiles). */
    private final StringRedisTemplate redisTemplate;

    /**
     * Mapa concurrente para fallback in-memory cuando Redis falla.
     * IP → cola de timestamps (ms) de peticiones recientes.
     */
    private final ConcurrentHashMap<String, Deque<Long>> requestTimestamps = new ConcurrentHashMap<>();

    /** Throttle del WARN log cuando Redis está caído (1 vez por minuto). */
    private final AtomicLong lastRedisDownWarnMs = new AtomicLong(0L);

    @Autowired
    public RateLimitGlobalFilter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public boolean preHandle(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull Object handler
    ) throws Exception {

        String ip = resolveClientIp(request);
        long nowSeconds = System.currentTimeMillis() / 1000L;
        long windowStart = (nowSeconds / WINDOW_SECONDS) * WINDOW_SECONDS;
        long windowReset = windowStart + WINDOW_SECONDS;

        // 1) Intento principal: Redis
        Long count = incrementInRedis(ip, windowStart);

        if (count != null) {
            return evaluate(response, ip, count.longValue(), windowReset);
        }

        // 2) Fallback in-memory (Redis caído o sin respuesta)
        return evaluateInMemory(response, ip, windowReset);
    }

    /**
     * Incrementa el contador en Redis. Devuelve null si Redis no responde o falla.
     */
    private Long incrementInRedis(String ip, long windowStart) {
        if (redisTemplate == null) {
            return null;
        }
        String key = KEY_PREFIX + ip + ":" + windowStart;
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count == null) {
                return null;
            }
            // Solo en el primer INCR de la ventana hace falta fijar el TTL.
            if (count == 1L) {
                redisTemplate.expire(key, REDIS_TTL);
            }
            return count;
        } catch (Exception ex) {
            warnRedisDownThrottled(ex);
            return null;
        }
    }

    /**
     * Evalúa el conteo obtenido de Redis y escribe headers + 429 si corresponde.
     */
    private boolean evaluate(HttpServletResponse response, String ip, long count, long windowReset)
            throws java.io.IOException {

        long remaining = Math.max(0L, MAX_REQUESTS_PER_MINUTE - count);
        response.setHeader("X-RateLimit-Limit", String.valueOf(MAX_REQUESTS_PER_MINUTE));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
        response.setHeader("X-RateLimit-Reset", String.valueOf(windowReset));

        if (count > MAX_REQUESTS_PER_MINUTE) {
            log.warn("Rate limit excedido para IP={} ({} req en ventana)", ip, count);
            writeTooManyRequests(response);
            return false;
        }
        return true;
    }

    /**
     * Fallback: lógica in-memory original con ventana deslizante por timestamps.
     * Coherente solo dentro de UNA instancia del gateway.
     */
    private boolean evaluateInMemory(HttpServletResponse response, String ip, long windowReset)
            throws java.io.IOException {

        long now = System.currentTimeMillis();
        long windowStartMs = now - WINDOW_MS;

        Deque<Long> timestamps = requestTimestamps.computeIfAbsent(ip, k -> new ArrayDeque<>());
        long size;
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst() <= windowStartMs) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= MAX_REQUESTS_PER_MINUTE) {
                log.warn("[FALLBACK in-memory] Rate limit excedido para IP={} ({} req/min)",
                        ip, timestamps.size());
                response.setHeader("X-RateLimit-Limit", String.valueOf(MAX_REQUESTS_PER_MINUTE));
                response.setHeader("X-RateLimit-Remaining", "0");
                response.setHeader("X-RateLimit-Reset", String.valueOf(windowReset));
                writeTooManyRequests(response);
                return false;
            }
            timestamps.addLast(now);
            size = timestamps.size();
        }

        response.setHeader("X-RateLimit-Limit", String.valueOf(MAX_REQUESTS_PER_MINUTE));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(MAX_REQUESTS_PER_MINUTE - size));
        response.setHeader("X-RateLimit-Reset", String.valueOf(windowReset));
        return true;
    }

    private void writeTooManyRequests(HttpServletResponse response) throws java.io.IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json");
        response.getWriter().write(
                "{\"error\":\"Too Many Requests\","
                        + "\"mensaje\":\"Has superado el límite de " + MAX_REQUESTS_PER_MINUTE
                        + " peticiones por minuto. Intenta de nuevo más tarde.\","
                        + "\"status\":429}"
        );
    }

    /**
     * Loguea WARN una sola vez por minuto cuando Redis está caído,
     * para no inundar logs si hay miles de peticiones por segundo.
     */
    private void warnRedisDownThrottled(Exception ex) {
        long now = System.currentTimeMillis();
        long last = lastRedisDownWarnMs.get();
        if (now - last >= 60_000L && lastRedisDownWarnMs.compareAndSet(last, now)) {
            log.warn("Redis no disponible para rate limit, usando fallback in-memory. Causa: {}",
                    ex.getMessage());
        }
    }

    /**
     * Extrae la IP real del cliente.
     * Prioriza el header {@code X-Forwarded-For} (primer valor) para funcionar
     * correctamente detrás de proxies/load balancers/ngrok.
     */
    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
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
