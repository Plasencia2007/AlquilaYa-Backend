package com.alquilaya.servicio_mensajeria.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Lado lectura del blacklist de JWT que escribe servicio-usuarios al hacer logout
 * (revocación de sesión). Comparte el mismo Redis (db 0) y el mismo esquema de key
 * — {@code usuarios:blacklist:jwt:<sha256(token)>} — para que la revocación también
 * aplique a las conexiones WebSocket de mensajería (S8).
 *
 * <p>Fail-open: si Redis no responde no bloqueamos (igual criterio que usuarios),
 * para no tumbar el chat por una caída transitoria de Redis.
 */
@Slf4j
@Service
public class JwtBlacklistChecker {

    // DEBE coincidir con JwtBlacklistService.KEY_PREFIX de servicio-usuarios.
    private static final String KEY_PREFIX = "usuarios:blacklist:jwt:";

    private final StringRedisTemplate redisTemplate;

    public JwtBlacklistChecker(@org.springframework.lang.Nullable StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /** @return true si el token fue revocado (logout); false si no, o si Redis falla (fail-open). */
    public boolean isBlacklisted(String token) {
        if (redisTemplate == null) {
            return false;
        }
        try {
            Boolean exists = redisTemplate.hasKey(KEY_PREFIX + sha256(token));
            return Boolean.TRUE.equals(exists);
        } catch (Exception e) {
            log.error("[WS] Error consultando blacklist en Redis (fail-open): {}", e.getMessage());
            return false;
        }
    }

    /** SHA-256 hex del token — idéntico al de servicio-usuarios (no se persiste el JWT crudo). */
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
            throw new IllegalStateException("SHA-256 no disponible en la JVM", e);
        }
    }
}
