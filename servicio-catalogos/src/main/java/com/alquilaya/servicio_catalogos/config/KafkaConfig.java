package com.alquilaya.servicio_catalogos.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/**
 * Topic de eventos de catálogo. Catalogos solo es productor (best-effort) de avisos de cambio
 * de universidades/zonas; servicio-propiedades los consume para invalidar sus caches de
 * zonas/campus sin esperar el TTL.
 */
@Configuration
public class KafkaConfig {

    public static final String TOPIC_CATALOGOS = "catalogos-topic";

    @Bean
    public NewTopic catalogosTopic() {
        return TopicBuilder.name(TOPIC_CATALOGOS)
                .partitions(1)
                .replicas(1)
                .build();
    }
}
