package com.alquilaya.serviciopropiedades.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

/**
 * Manejo de errores de los consumidores Kafka (I2). Tras agotar los reintentos, el registro
 * fallido se publica a la Dead-Letter Topic {@code <topic>.DLT} en vez de descartarse en
 * silencio. Spring Boot inyecta este {@link DefaultErrorHandler} en el container factory
 * autoconfigurado.
 *
 * <p>Aplica a los consumidores que dejan propagar la excepción (p.ej. CatalogosEventListener).
 * Los que ya tienen DLQ manual y atrapan internamente (PagoEventListener) NO se ven afectados,
 * porque no propagan la excepción al contenedor.
 */
@Configuration
public class KafkaErrorHandlerConfig {

    @Bean
    public DefaultErrorHandler kafkaErrorHandler(KafkaTemplate<String, String> template) {
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(template);
        // 4 intentos en total (inicial + 3 reintentos con 2s de backoff), luego DLQ.
        return new DefaultErrorHandler(recoverer, new FixedBackOff(2000L, 3L));
    }
}
