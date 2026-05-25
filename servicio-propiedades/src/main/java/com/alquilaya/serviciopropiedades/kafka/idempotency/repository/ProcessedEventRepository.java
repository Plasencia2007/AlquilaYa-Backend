package com.alquilaya.serviciopropiedades.kafka.idempotency.repository;

import com.alquilaya.serviciopropiedades.kafka.idempotency.entity.ProcessedEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessedEventRepository
        extends JpaRepository<ProcessedEvent, ProcessedEvent.PK> {
}
