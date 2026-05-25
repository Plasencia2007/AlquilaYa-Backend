package com.alquilaya.serviciousuarios.kafka.idempotency.repository;

import com.alquilaya.serviciousuarios.kafka.idempotency.entity.ProcessedEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessedEventRepository
        extends JpaRepository<ProcessedEvent, ProcessedEvent.ProcessedEventId> {
}
