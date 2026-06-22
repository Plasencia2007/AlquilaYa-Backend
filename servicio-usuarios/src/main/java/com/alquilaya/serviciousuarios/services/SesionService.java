package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.SesionDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Registro de sesiones/dispositivos (#10) en Redis. Cada login crea una sesión identificada
 * por el {@code jti} del token; el usuario puede listarlas y cerrarlas en remoto. El cierre
 * remoto marca el jti como revocado y el filtro de auth lo rechaza en el próximo request.
 *
 * <p>Fail-open igual que el blacklist: si Redis cae, no rompe el login (solo no hay gestión
 * de sesiones). Las claves expiran solas con el TTL del token.</p>
 */
@Slf4j
@Service
public class SesionService {

    private static final String SESIONES = "usuarios:sesiones:";          // + userId  → Hash(jti → json)
    private static final String REVOCADA = "usuarios:sesion-revocada:";   // + jti     → "1" (TTL)

    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Autowired
    public SesionService(@Nullable StringRedisTemplate redis, ObjectMapper mapper) {
        this.redis = redis;
        this.mapper = mapper;
    }

    /** Registra (o refresca) la sesión asociada a un jti tras emitir un token. Best-effort. */
    public void registrar(Long userId, String jti, HttpServletRequest req, Date expira) {
        if (redis == null || userId == null || jti == null) return;
        try {
            String dispositivo = describirDispositivo(req);
            String ip = clientIp(req);
            String key = SESIONES + userId;

            // Dedup: quita entradas previas del mismo dispositivo+IP para que re-loguear en
            // el mismo equipo no acumule sesiones repetidas en la lista.
            Map<Object, Object> previas = redis.opsForHash().entries(key);
            for (Map.Entry<Object, Object> e : previas.entrySet()) {
                try {
                    var n = mapper.readTree(e.getValue().toString());
                    if (dispositivo.equals(n.path("dispositivo").asText())
                            && ip.equals(n.path("ip").asText())) {
                        redis.opsForHash().delete(key, e.getKey());
                    }
                } catch (Exception ignore) { /* entrada corrupta: se ignora */ }
            }

            ObjectNode json = mapper.createObjectNode();
            json.put("jti", jti);
            json.put("dispositivo", dispositivo);
            json.put("ip", ip);
            json.put("creado", System.currentTimeMillis());
            json.put("expira", expira.getTime());

            redis.opsForHash().put(key, jti, mapper.writeValueAsString(json));
            // El hash vive lo que el token más largo; los campos vencidos se filtran al leer.
            redis.expire(key, jwtExpiration / 1000L, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("[SESIONES] No se pudo registrar la sesión: {}", e.getMessage());
        }
    }

    /** Sesiones activas del usuario (descarta vencidas). Marca como `actual` la del jti dado. */
    public List<SesionDTO> listar(Long userId, String jtiActual) {
        if (redis == null || userId == null) return List.of();
        try {
            Map<Object, Object> entries = redis.opsForHash().entries(SESIONES + userId);
            long ahora = System.currentTimeMillis();
            List<SesionDTO> out = new ArrayList<>();
            for (Object v : entries.values()) {
                JsonNode n = mapper.readTree(v.toString());
                long expira = n.path("expira").asLong(0);
                if (expira > 0 && expira < ahora) continue; // vencida
                String jti = n.path("jti").asText();
                out.add(new SesionDTO(
                        jti,
                        n.path("dispositivo").asText("Dispositivo"),
                        n.path("ip").asText(""),
                        n.path("creado").asLong(0),
                        jti.equals(jtiActual)));
            }
            out.sort(Comparator.comparingLong((SesionDTO s) -> s.creado() == null ? 0 : s.creado()).reversed());
            return out;
        } catch (Exception e) {
            log.error("[SESIONES] No se pudo listar: {}", e.getMessage());
            return List.of();
        }
    }

    /** Cierra una sesión en remoto: la quita del registro y marca su jti revocado. */
    public void revocar(Long userId, String jti) {
        if (redis == null || userId == null || jti == null) return;
        try {
            long ttl = jwtExpiration / 1000L;
            Object v = redis.opsForHash().get(SESIONES + userId, jti);
            if (v != null) {
                long expira = mapper.readTree(v.toString()).path("expira").asLong(0);
                if (expira > 0) {
                    long restante = (expira - System.currentTimeMillis()) / 1000L;
                    if (restante > 0) ttl = restante;
                }
            }
            redis.opsForValue().set(REVOCADA + jti, "1", ttl, TimeUnit.SECONDS);
            redis.opsForHash().delete(SESIONES + userId, jti);
        } catch (Exception e) {
            log.error("[SESIONES] No se pudo revocar: {}", e.getMessage());
        }
    }

    /** Cierra todas las sesiones del usuario excepto la actual. */
    public int revocarOtras(Long userId, String jtiActual) {
        if (redis == null || userId == null) return 0;
        int n = 0;
        for (SesionDTO s : listar(userId, jtiActual)) {
            if (!s.jti().equals(jtiActual)) {
                revocar(userId, s.jti());
                n++;
            }
        }
        return n;
    }

    /** True si el jti fue revocado (cierre remoto). Fail-open: false si Redis cae o no hay jti. */
    public boolean estaRevocada(String jti) {
        if (redis == null || jti == null) return false;
        try {
            return Boolean.TRUE.equals(redis.hasKey(REVOCADA + jti));
        } catch (Exception e) {
            return false;
        }
    }

    // ===== Helpers =====

    static String clientIp(HttpServletRequest req) {
        if (req == null) return "";
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int c = xff.indexOf(',');
            return (c > 0 ? xff.substring(0, c) : xff).trim();
        }
        String real = req.getHeader("X-Real-IP");
        return (real != null && !real.isBlank()) ? real.trim() : req.getRemoteAddr();
    }

    /** Nombre amigable del dispositivo a partir del User-Agent (navegador + SO). */
    static String describirDispositivo(HttpServletRequest req) {
        String ua = req != null ? req.getHeader("User-Agent") : null;
        if (ua == null || ua.isBlank()) return "Dispositivo desconocido";
        String u = ua.toLowerCase();
        String nav =
                u.contains("edg/") ? "Edge"
                : u.contains("opr/") || u.contains("opera") ? "Opera"
                : u.contains("chrome") ? "Chrome"
                : u.contains("firefox") ? "Firefox"
                : u.contains("safari") ? "Safari"
                : "Navegador";
        String so =
                u.contains("android") ? "Android"
                : (u.contains("iphone") || u.contains("ipad") || u.contains("ios")) ? "iOS"
                : u.contains("windows") ? "Windows"
                : (u.contains("mac os") || u.contains("macintosh")) ? "macOS"
                : u.contains("linux") ? "Linux"
                : "otro";
        return nav + " en " + so;
    }
}
