package com.alquilaya.serviciousuarios.services;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/**
 * Ciudad aproximada de una IP (hallazgo de backend, ítem 188: "Sesiones activas legibles" —
 * el listado de sesiones no traía ciudad). Usa ipapi.co (gratis, HTTPS, sin API key, ~1000
 * consultas/día — más que suficiente: solo se llama una vez por LOGIN, no por request).
 *
 * <p>Cachea por IP en Redis 24h (una IP no cambia de ciudad de un login a otro en ese lapso)
 * y salta por completo IPs privadas/localhost (desarrollo, redes internas) — no tiene sentido
 * geolocalizar 127.0.0.1. Fail-open: cualquier fallo (timeout, IP no resuelta, Redis caído)
 * devuelve {@code null} y {@link SesionService} simplemente omite el campo, nunca rompe el login.</p>
 */
@Slf4j
@Service
public class IpGeolocationService {

    private static final String CACHE_PREFIX = "usuarios:geo-ip:";
    private static final long CACHE_TTL_HORAS = 24;

    // 10.x, 172.16-31.x, 192.168.x, 127.x, ::1 y demás — no tiene sentido pedirle a un
    // servicio externo la ciudad de una IP que ni siquiera es enrutable en internet.
    private static final Pattern IP_PRIVADA = Pattern.compile(
            "^(10\\.|127\\.|192\\.168\\.|172\\.(1[6-9]|2\\d|3[01])\\.|::1|0:0:0:0:0:0:0:1|localhost)");

    private final RestTemplate restTemplate = new RestTemplate();
    private final StringRedisTemplate redis;

    public IpGeolocationService(@Nullable StringRedisTemplate redis) {
        this.redis = redis;
    }

    /** "Ciudad, País" (p. ej. "Lima, Peru"), o {@code null} si no se pudo resolver. */
    @Nullable
    public String resolverCiudad(@Nullable String ip) {
        if (ip == null || ip.isBlank() || IP_PRIVADA.matcher(ip).find()) return null;

        String cacheKey = CACHE_PREFIX + ip;
        try {
            if (redis != null) {
                String cacheada = redis.opsForValue().get(cacheKey);
                if (cacheada != null) return cacheada.isEmpty() ? null : cacheada;
            }
        } catch (Exception e) {
            log.warn("[GEO-IP] Redis no disponible al leer caché de {}: {}", ip, e.getMessage());
        }

        String resuelta = consultar(ip);
        try {
            if (redis != null) {
                // Cachea también el "no se pudo" (string vacío) — evita reintentar la misma IP
                // fallida en cada login dentro de la ventana de 24h.
                redis.opsForValue().set(cacheKey, resuelta == null ? "" : resuelta, CACHE_TTL_HORAS, TimeUnit.HOURS);
            }
        } catch (Exception e) {
            log.warn("[GEO-IP] Redis no disponible al cachear {}: {}", ip, e.getMessage());
        }
        return resuelta;
    }

    @Nullable
    private String consultar(String ip) {
        try {
            IpApiResponse res = restTemplate.getForObject(
                    "https://ipapi.co/" + ip + "/json/", IpApiResponse.class);
            if (res == null || res.error || res.city == null || res.city.isBlank()) return null;
            return res.countryName != null && !res.countryName.isBlank()
                    ? res.city + ", " + res.countryName
                    : res.city;
        } catch (Exception e) {
            log.warn("[GEO-IP] Fallo consultando ipapi.co para {}: {}", ip, e.getMessage());
            return null;
        }
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class IpApiResponse {
        private String city;
        private boolean error;
        @com.fasterxml.jackson.annotation.JsonProperty("country_name")
        private String countryName;
    }
}
