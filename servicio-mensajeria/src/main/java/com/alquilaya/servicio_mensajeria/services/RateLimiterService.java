package com.alquilaya.servicio_mensajeria.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Rate limiting basado en Redis con ventana por minuto.
 *
 * Key: mensajeria:ratelimit:&lt;userId&gt;:&lt;yyyyMMddHHmm&gt;
 * Operación: INCR + EXPIRE 120s (TTL doble del minuto para tolerar relojes desalineados).
 *
 * Graceful degradation: si Redis está caído (RedisTemplate null o lanza excepción),
 * loggeamos warn y permitimos el envío. Es preferible permitir spam ocasional a
 * romper el chat por una caída de la cache.
 */
@Slf4j
@Service
public class RateLimiterService {

    /** Tope de mensajes por minuto por usuario (~1 msg/s sostenido). */
    private static final int MAX_MESSAGES_PER_MINUTE = 60;
    private static final Duration WINDOW_TTL = Duration.ofSeconds(120);
    private static final String PREFIX = "mensajeria:ratelimit:";

    private final StringRedisTemplate redisTemplate;

    @Autowired
    public RateLimiterService(@org.springframework.beans.factory.annotation.Autowired(required = false)
                              StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Verifica y registra el intento de envío del usuario. Retorna true si está permitido,
     * false si superó el umbral.
     */
    public boolean tryAcquire(Long userId) {
        if (userId == null) return true;
        if (redisTemplate == null) {
            // Redis no configurado en este entorno (test, dev sin Redis): permitir.
            return true;
        }

        String key = buildKey(userId);
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count == null) {
                // No debería pasar — pero si pasa, permitimos.
                return true;
            }
            if (count == 1L) {
                // Primera vez en esta ventana: setear TTL.
                redisTemplate.expire(key, WINDOW_TTL);
            }
            if (count > MAX_MESSAGES_PER_MINUTE) {
                log.warn("Rate limit excedido userId={} count={} key={}", userId, count, key);
                return false;
            }
            return true;
        } catch (Exception e) {
            // Redis caído / timeout / cualquier error → graceful degradation.
            log.warn("Redis no disponible para rate limit (userId={}): {} — permitiendo envío",
                    userId, e.getMessage());
            return true;
        }
    }

    private String buildKey(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        // yyyyMMddHHmm — ventana fija de 1 minuto.
        String window = String.format("%04d%02d%02d%02d%02d",
                now.getYear(), now.getMonthValue(), now.getDayOfMonth(),
                now.getHour(), now.getMinute());
        return PREFIX + userId + ":" + window;
    }
}
