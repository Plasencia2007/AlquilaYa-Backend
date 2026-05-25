package com.alquilaya.serviciousuarios.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

/**
 * Rate limiter de validación de OTP respaldado por Redis para mitigar
 * brute force de los 6 dígitos.
 *
 * <p>Keys utilizadas (con prefijo {@code usuarios:}):</p>
 * <ul>
 *   <li>{@code usuarios:otp:attempts:<telefono>} — contador de intentos fallidos.
 *       TTL: 600s en el primer INCR.</li>
 *   <li>{@code usuarios:otp:lockout:<telefono>} — marca de bloqueo. TTL: 1800s.
 *       Mientras exista, se rechaza la verificación.</li>
 * </ul>
 *
 * <p><b>Graceful degradation:</b> si Redis no responde, los métodos registran
 * un warning y permiten la operación (comportamiento previo). No bloqueamos
 * al usuario por una caída de la infra de rate limiting.</p>
 */
@Slf4j
@Service
public class OtpRateLimitService {

    public static final int MAX_ATTEMPTS = 3;
    public static final long ATTEMPTS_TTL_SECONDS = 600;   // 10 min
    public static final long LOCKOUT_TTL_SECONDS = 1800;   // 30 min

    private static final String ATTEMPTS_PREFIX = "usuarios:otp:attempts:";
    private static final String LOCKOUT_PREFIX = "usuarios:otp:lockout:";

    private final StringRedisTemplate redisTemplate;

    @Autowired
    public OtpRateLimitService(@org.springframework.lang.Nullable StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Lanza si el teléfono está actualmente bloqueado por exceso de intentos.
     * No-op si Redis no responde.
     */
    public void verificarLockout(String telefono) {
        if (redisTemplate == null) return;
        try {
            Boolean locked = redisTemplate.hasKey(LOCKOUT_PREFIX + telefono);
            if (Boolean.TRUE.equals(locked)) {
                throw new OtpLockoutException(
                        "Demasiados intentos fallidos. Intenta de nuevo en unos minutos.");
            }
        } catch (OtpLockoutException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Redis no disponible al verificar lockout OTP: {}", e.getMessage());
        }
    }

    /**
     * Registra un intento fallido. Si el contador supera {@link #MAX_ATTEMPTS},
     * activa el lockout y lanza {@link OtpLockoutException}.
     */
    public void registrarFallo(String telefono) {
        if (redisTemplate == null) return;
        try {
            String attemptsKey = ATTEMPTS_PREFIX + telefono;
            Long count = redisTemplate.opsForValue().increment(attemptsKey);
            // En el primer INCR la key no tiene TTL; lo seteamos.
            if (count != null && count == 1L) {
                redisTemplate.expire(attemptsKey, ATTEMPTS_TTL_SECONDS, TimeUnit.SECONDS);
            }
            if (count != null && count > MAX_ATTEMPTS) {
                redisTemplate.opsForValue().set(
                        LOCKOUT_PREFIX + telefono, "1",
                        LOCKOUT_TTL_SECONDS, TimeUnit.SECONDS);
                throw new OtpLockoutException(
                        "Demasiados intentos fallidos. Intenta de nuevo en unos minutos.");
            }
        } catch (OtpLockoutException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Redis no disponible al registrar fallo OTP: {}", e.getMessage());
        }
    }

    /** Limpia contador y lockout tras un OTP correcto. */
    public void limpiar(String telefono) {
        if (redisTemplate == null) return;
        try {
            redisTemplate.delete(ATTEMPTS_PREFIX + telefono);
            redisTemplate.delete(LOCKOUT_PREFIX + telefono);
        } catch (Exception e) {
            log.warn("Redis no disponible al limpiar contadores OTP: {}", e.getMessage());
        }
    }

    /**
     * Excepción mapeada a HTTP 429 desde {@code GlobalExceptionHandler}.
     */
    public static class OtpLockoutException extends RuntimeException {
        public OtpLockoutException(String message) {
            super(message);
        }
    }
}
