package com.alquilaya.api_gateway.filter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

/**
 * Rechaza en el gateway (un solo punto, para TODOS los servicios) las peticiones cuyo JWT
 * fue revocado: logout (blacklist por hash) o cierre remoto de sesión (jti revocado). Lee las
 * mismas keys de Redis que escribe servicio-usuarios:
 *   - {@code usuarios:blacklist:jwt:<sha256(token)>}
 *   - {@code usuarios:sesion-revocada:<jti>}
 *
 * <p>NO valida la firma del JWT (eso lo hace cada servicio downstream); solo consulta la
 * revocación. <b>Fail-open</b>: si Redis no responde, deja pasar (no bloquea tráfico legítimo).
 */
@Component
public class JwtRevocationInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(JwtRevocationInterceptor.class);

    private static final String BLACKLIST_PREFIX = "usuarios:blacklist:jwt:";
    private static final String REVOCADA_PREFIX = "usuarios:sesion-revocada:";

    private final StringRedisTemplate redis;
    private final ObjectMapper mapper = new ObjectMapper();

    public JwtRevocationInterceptor(@Nullable StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public boolean preHandle(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull Object handler
    ) throws Exception {
        if (redis == null) return true; // fail-open: sin Redis no podemos verificar

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) return true;
        String token = header.substring(7);

        try {
            // 1) Logout (token completo en blacklist)
            if (Boolean.TRUE.equals(redis.hasKey(BLACKLIST_PREFIX + sha256(token)))) {
                return rechazar(response);
            }
            // 2) Cierre remoto (jti de la sesión revocado)
            String jti = extraerJti(token);
            if (jti != null && Boolean.TRUE.equals(redis.hasKey(REVOCADA_PREFIX + jti))) {
                return rechazar(response);
            }
        } catch (Exception e) {
            // Fail-open: si Redis falla, no bloqueamos al usuario.
            log.debug("Revocación no verificable (fail-open): {}", e.getMessage());
            return true;
        }
        return true;
    }

    private boolean rechazar(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType("application/json");
        response.getWriter().write(
                "{\"error\":\"Sesión cerrada. Inicia sesión nuevamente.\",\"status\":401}");
        return false;
    }

    /** Lee el claim {@code jti} del payload del JWT sin verificar la firma. */
    private String extraerJti(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return null;
            String p = parts[1];
            int pad = (4 - p.length() % 4) % 4;
            p = p + "=".repeat(pad);
            byte[] payload = Base64.getUrlDecoder().decode(p);
            JsonNode n = mapper.readTree(payload);
            return n.hasNonNull("jti") ? n.get("jti").asText() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }
}
