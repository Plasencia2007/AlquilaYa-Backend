package com.alquilaya.serviciopropiedades.config;

import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

/**
 * Configuración Redis para:
 *   - Cache de listados públicos de propiedades (TTL 5 min).
 *   - Templates para uso directo (cola de limpieza Cloudinary).
 *
 * Convenciones de keys (todas con prefijo `propiedades:` para aislamiento del
 * resto de servicios que comparten el mismo Redis):
 *   - propiedades:cache:propiedades:listado::*  (entries de @Cacheable)
 *   - propiedades:cloudinary:cleanup            (Redis List con URLs/publicIds
 *      pendientes de borrar best-effort)
 */
@Configuration
public class RedisCacheConfig {

    public static final String PREFIX = "propiedades:";
    public static final String CACHE_PREFIX = PREFIX + "cache:";
    public static final String CACHE_LISTADO = "propiedades:listado";

    private GenericJackson2JsonRedisSerializer jsonSerializer() {
        // Partimos del serializer por defecto (su mapper interno ya trae el manejo
        // de tipos polimórficos `@class` que SÍ hace round-trip de colecciones en la
        // raíz, p.ej. List<PropiedadPublicoDTO>) y solo le añadimos el soporte de
        // java.time. Construir el ObjectMapper a mano con activateDefaultTyping en
        // formato WRAPPER_ARRAY rompía la lectura de listas cacheadas
        // ("Unexpected token (START_ARRAY), expected VALUE_STRING ... type id").
        return new GenericJackson2JsonRedisSerializer()
                .configure(mapper -> mapper.registerModule(new JavaTimeModule()));
    }

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .disableCachingNullValues()
                .computePrefixWith(cacheName -> CACHE_PREFIX + cacheName + "::")
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(jsonSerializer()));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .build();
    }

    /**
     * Template genérico (String keys, JSON values) para usar directamente en
     * casos donde Spring Cache no encaja (e.g. cola de limpieza Cloudinary).
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(jsonSerializer());
        template.setHashValueSerializer(jsonSerializer());
        template.afterPropertiesSet();
        return template;
    }
}
