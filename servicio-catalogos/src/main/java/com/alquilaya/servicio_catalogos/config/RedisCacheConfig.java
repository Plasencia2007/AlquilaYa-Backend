package com.alquilaya.servicio_catalogos.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

/**
 * Configura un {@link RedisCacheManager} para reemplazar el {@code ConcurrentMapCacheManager}
 * por defecto. Esto hace que los caches {@code filtrosActivos} y {@code carrerasActivas}
 * sean compartidos entre instancias del servicio-catalogos.
 *
 * <ul>
 *   <li>TTL: 1 hora — los catálogos cambian muy poco.</li>
 *   <li>Serialización JSON (GenericJackson2JsonRedisSerializer) con tipos polimórficos para
 *       preservar las clases concretas de entidades/DTOs al deserializar.</li>
 *   <li>Prefijo de keys: {@code catalogos:cache:&lt;cacheName&gt;::&lt;key&gt;}.</li>
 * </ul>
 *
 * Los {@code @Cacheable} / {@code @CacheEvict} existentes se mantienen — solo cambia
 * el backend del cache (de in-memory a Redis).
 */
@Configuration
public class RedisCacheConfig {

    private static final Duration CACHE_TTL = Duration.ofHours(1);
    private static final String KEY_PREFIX = "catalogos:cache:";

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        // Activamos tipado polimórfico para entidades JPA / DTOs serializados.
        // Restringido a paquetes del proyecto y java.* para no abrir vector de gadgets.
        mapper.activateDefaultTyping(
                BasicPolymorphicTypeValidator.builder()
                        .allowIfBaseType(Object.class)
                        .build(),
                ObjectMapper.DefaultTyping.NON_FINAL);

        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer(mapper);

        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(CACHE_TTL)
                .prefixCacheNameWith(KEY_PREFIX)
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(jsonSerializer));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .build();
    }
}
