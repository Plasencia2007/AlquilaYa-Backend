package com.alquilaya.serviciousuarios.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

/**
 * Rate limiter de verificación de código de email respaldado por Redis, análogo a
 * {@link OtpRateLimitService} pero con clave por CORREO en vez de por teléfono.
 *
 * <p>{@link EmailVerificationService#verificarCodigo} no tenía ningún lockout por cuenta —
 * solo lo cubría el {@code RateLimitFilter} genérico (10 req/min por IP), insuficiente
 * contra fuerza bruta de los 6 dígitos rotando de IP. Se replica aquí la misma lógica de
 * {@link OtpRateLimitService} (3 intentos fallidos / 10 min → bloqueo 30 min) como clase
 * paralela, en vez de generalizar esa clase, para no arriesgar el flujo de OTP por teléfono
 * ya probado en producción con un cambio más invasivo.</p>
 *
 * <p>Keys utilizadas (con prefijo {@code usuarios:}):</p>
 * <ul>
 *   <li>{@code usuarios:email-verif:attempts:<correo>} — contador de intentos fallidos.
 *       TTL: 600s en el primer INCR.</li>
 *   <li>{@code usuarios:email-verif:lockout:<correo>} — marca de bloqueo. TTL: 1800s.
 *       Mientras exista, se rechaza la verificación.</li>
 * </ul>
 *
 * <p><b>Graceful degradation:</b> si Redis no responde, los métodos registran un warning y
 * permiten la operación, igual que {@link OtpRateLimitService}.</p>
 */
@Slf4j
@Service
public class EmailRateLimitService {

    public static final int MAX_ATTEMPTS = 3;
    public static final long ATTEMPTS_TTL_SECONDS = 600;   // 10 min
    public static final long LOCKOUT_TTL_SECONDS = 1800;   // 30 min

    private static final String ATTEMPTS_PREFIX = "usuarios:email-verif:attempts:";
    private static final String LOCKOUT_PREFIX = "usuarios:email-verif:lockout:";

    private final StringRedisTemplate redisTemplate;

    @Autowired
    public EmailRateLimitService(@org.springframework.lang.Nullable StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Lanza si el correo está actualmente bloqueado por exceso de intentos.
     * No-op si Redis no responde.
     */
    public void verificarLockout(String correo) {
        if (redisTemplate == null) return;
        try {
            Boolean locked = redisTemplate.hasKey(LOCKOUT_PREFIX + correo);
            if (Boolean.TRUE.equals(locked)) {
                throw new OtpRateLimitService.OtpLockoutException(
                        "Demasiados intentos fallidos. Intenta de nuevo en unos minutos.");
            }
        } catch (OtpRateLimitService.OtpLockoutException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Redis no disponible al verificar lockout de verificación de email: {}", e.getMessage());
        }
    }

    /**
     * Registra un intento fallido. Si el contador supera {@link #MAX_ATTEMPTS},
     * activa el lockout y lanza {@link OtpRateLimitService.OtpLockoutException}
     * (reutilizada tal cual: ya está mapeada a HTTP 429 en {@code GlobalExceptionHandler}
     * y no tiene ningún campo específico de OTP/teléfono).
     */
    public void registrarFallo(String correo) {
        if (redisTemplate == null) return;
        try {
            String attemptsKey = ATTEMPTS_PREFIX + correo;
            Long count = redisTemplate.opsForValue().increment(attemptsKey);
            // En el primer INCR la key no tiene TTL; lo seteamos.
            if (count != null && count == 1L) {
                redisTemplate.expire(attemptsKey, ATTEMPTS_TTL_SECONDS, TimeUnit.SECONDS);
            }
            if (count != null && count > MAX_ATTEMPTS) {
                redisTemplate.opsForValue().set(
                        LOCKOUT_PREFIX + correo, "1",
                        LOCKOUT_TTL_SECONDS, TimeUnit.SECONDS);
                throw new OtpRateLimitService.OtpLockoutException(
                        "Demasiados intentos fallidos. Intenta de nuevo en unos minutos.");
            }
        } catch (OtpRateLimitService.OtpLockoutException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Redis no disponible al registrar fallo de verificación de email: {}", e.getMessage());
        }
    }

    /** Limpia contador y lockout tras un código correcto. */
    public void limpiar(String correo) {
        if (redisTemplate == null) return;
        try {
            redisTemplate.delete(ATTEMPTS_PREFIX + correo);
            redisTemplate.delete(LOCKOUT_PREFIX + correo);
        } catch (Exception e) {
            log.warn("Redis no disponible al limpiar contadores de verificación de email: {}", e.getMessage());
        }
    }
}
