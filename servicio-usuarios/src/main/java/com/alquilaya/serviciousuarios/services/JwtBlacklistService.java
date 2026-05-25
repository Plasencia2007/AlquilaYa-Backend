package com.alquilaya.serviciousuarios.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.concurrent.TimeUnit;

/**
 * Servicio de revocación de tokens JWT respaldado por Redis.
 *
 * <p>Almacena el SHA-256 hex del JWT como key con TTL igual al tiempo de vida
 * restante del token. Una vez expira el token, la entrada se borra sola
 * (no requiere limpieza periódica).</p>
 *
 * <p><b>Graceful degradation:</b> si Redis no está disponible, las operaciones
 * registran el error pero NO propagan la excepción. Esto preserva el
 * comportamiento previo (donde el blacklist no se consultaba en absoluto) y
 * evita que una caída de Redis tire abajo el login/auth. Falla abierto.</p>
 */
@Slf4j
@Service
public class JwtBlacklistService {

    /** Prefijo de keys en Redis. Aislamiento del servicio-usuarios. */
    private static final String KEY_PREFIX = "usuarios:blacklist:jwt:";

    private final StringRedisTemplate redisTemplate;

    @Autowired
    public JwtBlacklistService(@org.springframework.lang.Nullable StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Agrega un token al blacklist hasta su fecha de expiración natural.
     *
     * @param token    JWT completo (será hasheado, no se guarda en claro)
     * @param expiresAt fecha de expiración original del token
     */
    public void blacklist(String token, Date expiresAt) {
        if (redisTemplate == null) {
            log.warn("Redis no disponible; no se puede revocar token (fail-open).");
            return;
        }
        try {
            long ttlSeconds = (expiresAt.getTime() - System.currentTimeMillis()) / 1000L;
            if (ttlSeconds <= 0) {
                // Token ya expirado, no tiene sentido guardarlo
                return;
            }
            String key = KEY_PREFIX + sha256(token);
            redisTemplate.opsForValue().set(key, "1", ttlSeconds, TimeUnit.SECONDS);
        } catch (Exception e) {
            // Graceful degradation: si Redis cae, no rompemos el logout.
            log.error("Error agregando token al blacklist en Redis: {}", e.getMessage());
        }
    }

    /**
     * Indica si el token fue revocado previamente.
     *
     * @return true si está en blacklist; false en caso contrario o si Redis falla
     *         (fail-open: si no podemos verificar, no bloqueamos la request).
     */
    public boolean isBlacklisted(String token) {
        if (redisTemplate == null) {
            return false;
        }
        try {
            String key = KEY_PREFIX + sha256(token);
            Boolean exists = redisTemplate.hasKey(key);
            return Boolean.TRUE.equals(exists);
        } catch (Exception e) {
            // Fail-open: si Redis no responde, no bloqueamos al usuario.
            log.error("Error consultando blacklist en Redis: {}", e.getMessage());
            return false;
        }
    }

    /** Calcula SHA-256 hex del token para no persistir el JWT crudo. */
    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 está garantizado por la JVM; este branch es defensivo.
            throw new IllegalStateException("SHA-256 no disponible en la JVM", e);
        }
    }
}
