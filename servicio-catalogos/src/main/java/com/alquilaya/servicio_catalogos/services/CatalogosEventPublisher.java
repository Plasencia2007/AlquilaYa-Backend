package com.alquilaya.servicio_catalogos.services;

import com.alquilaya.servicio_catalogos.config.KafkaConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Publica avisos de cambio de catálogo en {@code catalogos-topic}. Es best-effort: si Kafka
 * está caído, se loguea y se sigue (el consumidor tiene un TTL de respaldo). El envío se
 * difiere al commit de la transacción para que el consumidor nunca relea datos sin persistir.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CatalogosEventPublisher {

    /** El consumidor solo necesita saber "el catálogo de universidades/zonas cambió". */
    public static final String EVENTO_UNIVERSIDADES_CAMBIO = "UNIVERSIDADES_CAMBIO";

    private final KafkaTemplate<String, String> kafkaTemplate;

    /** Avisa que cambiaron universidades o zonas (alta/edición/baja). */
    public void publicarCambioUniversidades() {
        publicarTrasCommit(EVENTO_UNIVERSIDADES_CAMBIO);
    }

    private void publicarTrasCommit(String evento) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    enviar(evento);
                }
            });
        } else {
            enviar(evento);
        }
    }

    private void enviar(String evento) {
        try {
            kafkaTemplate.send(KafkaConfig.TOPIC_CATALOGOS, evento);
            log.info("[CATALOGOS] Evento '{}' publicado en {}", evento, KafkaConfig.TOPIC_CATALOGOS);
        } catch (Exception e) {
            log.warn("[CATALOGOS] No se pudo publicar '{}' en {}: {}",
                    evento, KafkaConfig.TOPIC_CATALOGOS, e.getMessage());
        }
    }
}
