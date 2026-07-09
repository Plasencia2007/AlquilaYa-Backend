package com.alquilaya.serviciousuarios.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

/**
 * Refresh tokens (G7) en Redis, con ROTACIÓN: cada uso consume el token y emite uno nuevo.
 * Así, si un refresh token robado se reutiliza después de que el legítimo ya rotó, la
 * validación falla (el hash viejo ya no existe) — detecta el robo en vez de permitirlo indefinido.
 *
 * <p>Sólo se guarda el HASH (SHA-256) del token, nunca el valor en claro, igual que el
 * password-reset. Dos claves por token:
 * <ul>
 *   <li>{@code usuarios:refresh:<hash>} → userId, con TTL = expiración (lookup O(1) al refrescar).</li>
 *   <li>{@code usuarios:refresh-idx:<userId>} → Hash(hash → "1"), para poder revocar TODOS los
 *       refresh tokens de un usuario (logout-all, cambio de contraseña) sin conocerlos de antemano.</li>
 * </ul>
 *
 * <p>Fail-open igual que {@link SesionService}: si Redis cae, el refresh simplemente no
 * funciona (login normal sigue intacto), no rompe nada más.</p>
 */
@Slf4j
@Service
public class RefreshTokenService {

    private static final String LOOKUP = "usuarios:refresh:";
    private static final String INDEX = "usuarios:refresh-idx:";

    private final StringRedisTemplate redis;
    private final SecureRandom random = new SecureRandom();

    @Value("${jwt.refresh-expiration-ms:2592000000}") // 30 días por default
    private long refreshExpirationMs;

    @Autowired
    public RefreshTokenService(@Nullable StringRedisTemplate redis) {
        this.redis = redis;
    }

    /** Emite un nuevo refresh token para el usuario. Devuelve el token en claro (solo se guarda su hash). */
    public String generar(Long userId) {
        if (redis == null || userId == null) return null;
        String token = tokenAleatorio();
        guardar(userId, token);
        return token;
    }

    /**
     * Valida el refresh token y, si es válido, lo ROTA: revoca el usado y emite uno nuevo.
     * Devuelve {@code Optional.empty()} si es inválido/expirado/ya usado (posible robo/reintento).
     */
    public Optional<Resultado> validarYRotar(String token) {
        if (redis == null || token == null || token.isBlank()) return Optional.empty();
        String hash = hash(token);
        String userIdStr = redis.opsForValue().get(LOOKUP + hash);
        if (userIdStr == null) {
            log.warn("[REFRESH] Token inválido, expirado o ya usado (posible reintento/robo)");
            return Optional.empty();
        }
        Long userId = Long.valueOf(userIdStr);
        revocarInterno(userId, hash);
        String nuevoToken = tokenAleatorio();
        guardar(userId, nuevoToken);
        return Optional.of(new Resultado(userId, nuevoToken));
    }

    /** Revoca un refresh token específico (p. ej. al hacer logout). Best-effort. */
    public void revocar(String token) {
        if (redis == null || token == null || token.isBlank()) return;
        String hash = hash(token);
        String userIdStr = redis.opsForValue().get(LOOKUP + hash);
        if (userIdStr == null) return;
        revocarInterno(Long.valueOf(userIdStr), hash);
    }

    /** Revoca TODOS los refresh tokens de un usuario (logout-all, cambio/reset de contraseña). */
    public void revocarTodas(Long userId) {
        if (redis == null || userId == null) return;
        try {
            Map<Object, Object> entradas = redis.opsForHash().entries(INDEX + userId);
            for (Object hash : entradas.keySet()) {
                redis.delete(LOOKUP + hash);
            }
            redis.delete(INDEX + userId);
        } catch (Exception e) {
            log.warn("[REFRESH] No se pudo revocar todas las sesiones de refresh del usuario {}: {}", userId, e.getMessage());
        }
    }

    private void revocarInterno(Long userId, String hash) {
        try {
            redis.delete(LOOKUP + hash);
            redis.opsForHash().delete(INDEX + userId, hash);
        } catch (Exception e) {
            log.warn("[REFRESH] Error revocando token: {}", e.getMessage());
        }
    }

    private void guardar(Long userId, String token) {
        try {
            String hash = hash(token);
            redis.opsForValue().set(LOOKUP + hash, String.valueOf(userId), Duration.ofMillis(refreshExpirationMs));
            redis.opsForHash().put(INDEX + userId, hash, "1");
            // El índice completo no necesita TTL por campo: entradas huérfanas (tras expirar el
            // lookup) sólo ocupan un puñado de bytes y se limpian solas en revocarTodas().
            redis.expire(INDEX + userId, Duration.ofMillis(refreshExpirationMs).plus(Duration.ofDays(1)));
        } catch (Exception e) {
            log.warn("[REFRESH] No se pudo guardar el refresh token: {}", e.getMessage());
        }
    }

    private String tokenAleatorio() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] h = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(h);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }

    public record Resultado(Long userId, String nuevoRefreshToken) {}
}
