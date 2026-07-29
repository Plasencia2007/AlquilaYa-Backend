package com.alquilaya.servicio_mensajeria.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/**
 * Declaración de los topics que este servicio PRODUCE.
 *
 * <p>Hasta ahora servicio-mensajeria sólo consumía Kafka; con la métrica de tiempo de
 * respuesta del arrendador pasa a producir señales de reputación hacia
 * {@code resenas-topic} (el mismo topic que servicio-propiedades usa para actividad y
 * calificaciones, y que servicio-usuarios consume). Declararlo aquí garantiza que exista
 * si mensajería arranca antes que propiedades. {@code KafkaAdmin} es idempotente: si el
 * topic ya existe con la misma config, no lo recrea.
 */
@Configuration
public class KafkaTopicConfig {

    @Bean
    public NewTopic resenasTopic() {
        return TopicBuilder.name("resenas-topic")
                .partitions(1)
                .replicas(1)
                .build();
    }
}
