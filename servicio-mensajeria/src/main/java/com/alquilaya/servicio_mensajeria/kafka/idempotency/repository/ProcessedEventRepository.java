package com.alquilaya.servicio_mensajeria.kafka.idempotency.repository;

import com.alquilaya.servicio_mensajeria.kafka.idempotency.entity.ProcessedEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcessedEventRepository
        extends JpaRepository<ProcessedEvent, ProcessedEvent.PK> {
}
