package com.alquilaya.serviciousuarios.outbox.repository;

import com.alquilaya.serviciousuarios.outbox.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OutboxRepository extends JpaRepository<OutboxEvent, Long> {

    /**
     * Lee un batch de eventos pendientes con LOCK pesimista
     * ({@code FOR UPDATE SKIP LOCKED}) para soportar múltiples réplicas del
     * servicio drenando la outbox en paralelo sin pisarse.
     */
    @Query(value = """
            SELECT * FROM outbox_events
            WHERE sent_at IS NULL AND attempts < 5
            ORDER BY created_at ASC
            LIMIT :limit
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<OutboxEvent> findPendientesParaPublicar(@Param("limit") int limit);
}
