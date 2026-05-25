package com.alquilaya.serviciopropiedades.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Cola Redis (List) con URLs de imágenes Cloudinary que no se pudieron borrar
 * en línea. Un consumer/job posterior (no implementado todavía) leerá de esta
 * cola y reintentará el destroy.
 *
 * Key: propiedades:cloudinary:cleanup
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryCleanupQueueService {

    public static final String QUEUE_KEY = "propiedades:cloudinary:cleanup";

    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * Encola una URL para limpieza diferida. Si Redis está caído, log warn y
     * devuelve false — el caller ya decidió que prefiere huérfanos a bloquear
     * la operación de negocio.
     */
    public boolean encolar(String url) {
        if (url == null || url.isBlank()) return false;
        try {
            redisTemplate.opsForList().rightPush(QUEUE_KEY, url);
            log.info("[CLEANUP] URL encolada para limpieza Cloudinary: {}", url);
            return true;
        } catch (Exception e) {
            log.warn("[CLEANUP] No se pudo encolar URL {} en Redis: {}", url, e.getMessage());
            return false;
        }
    }
}
