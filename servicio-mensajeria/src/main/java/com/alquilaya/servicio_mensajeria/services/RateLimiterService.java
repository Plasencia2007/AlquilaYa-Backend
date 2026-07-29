package com.alquilaya.servicio_mensajeria.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

/**
 * Rate limiting basado en Redis con ventana deslizante ("sliding window log").
 *
 * Key: mensajeria:ratelimit:&lt;userId&gt;
 * Estructura: sorted set (ZSET) donde el score es el timestamp (epoch millis) del
 * intento y el member es un valor único (evita colisiones cuando dos intentos caen
 * en el mismo milisegundo). En cada intento:
 *   1. ZREMRANGEBYSCORE — purga entradas con score &lt; (ahora - ventana).
 *   2. ZCARD — cuenta los intentos vigentes dentro de la ventana.
 *   3. Si no se superó el límite: ZADD el intento actual + EXPIRE (housekeeping del key).
 *
 * A diferencia de una ventana fija (clave por minuto tipo yyyyMMddHHmm), esto no
 * permite ráfagas de hasta 2x el límite en el borde de la ventana: siempre se cuentan
 * los últimos N segundos reales, sin importar dónde caigan.
 *
 * Graceful degradation: si Redis está caído (RedisTemplate null o lanza excepción),
 * loggeamos warn y permitimos el envío. Es preferible permitir spam ocasional a
 * romper el chat por una caída de la cache.
 */
@Slf4j
@Service
public class RateLimiterService {

    /** Tope de mensajes por ventana por usuario (~1 msg/s sostenido). */
    private static final int MAX_MESSAGES_PER_MINUTE = 60;
    private static final Duration WINDOW = Duration.ofMinutes(1);
    private static final Duration KEY_TTL = Duration.ofSeconds(120);
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
            long now = System.currentTimeMillis();
            long windowStart = now - WINDOW.toMillis();

            // Purga entradas fuera de la ventana deslizante.
            redisTemplate.opsForZSet().removeRangeByScore(key, Double.NEGATIVE_INFINITY, windowStart);

            Long currentCount = redisTemplate.opsForZSet().zCard(key);
            long count = currentCount == null ? 0L : currentCount;

            if (count >= MAX_MESSAGES_PER_MINUTE) {
                log.warn("Rate limit excedido userId={} count={} key={}", userId, count, key);
                return false;
            }

            // Member único por intento: mismo timestamp en el mismo ms no debe colisionar.
            redisTemplate.opsForZSet().add(key, UUID.randomUUID().toString(), now);
            redisTemplate.expire(key, KEY_TTL);
            return true;
        } catch (Exception e) {
            // Redis caído / timeout / cualquier error → graceful degradation.
            log.warn("Redis no disponible para rate limit (userId={}): {} — permitiendo envío",
                    userId, e.getMessage());
            return true;
        }
    }

    private String buildKey(Long userId) {
        return PREFIX + userId;
    }
}
