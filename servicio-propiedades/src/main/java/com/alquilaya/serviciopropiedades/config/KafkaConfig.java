package com.alquilaya.serviciopropiedades.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    @Bean
    public NewTopic propiedadesTopic() {
        return TopicBuilder.name("propiedades-topic")
                .partitions(1)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic resenasTopic() {
        return TopicBuilder.name("resenas-topic")
                .partitions(1)
                .replicas(1)
                .build();
    }

    /**
     * Dead-letter queue para eventos del topic `pagos-topic` que fallen al
     * procesarse en {@code PagoEventListener}. Los mensajes se publican con
     * headers original-topic, error-message y failure-timestamp.
     */
    @Bean
    public NewTopic pagosDlqTopic() {
        return TopicBuilder.name("pagos-topic-dlq")
                .partitions(1)
                .replicas(1)
                .build();
    }
}
