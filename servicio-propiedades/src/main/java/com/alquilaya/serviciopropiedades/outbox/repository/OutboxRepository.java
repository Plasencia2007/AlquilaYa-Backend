package com.alquilaya.serviciopropiedades.outbox.repository;

import com.alquilaya.serviciopropiedades.outbox.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OutboxRepository extends JpaRepository<OutboxEvent, Long> {

    @Query(value = """
            SELECT * FROM outbox_events
            WHERE sent_at IS NULL AND attempts < 5
            ORDER BY created_at ASC
            LIMIT :limit
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<OutboxEvent> findPendientesParaPublicar(@Param("limit") int limit);

    /**
     * Eventos "varados": agotaron los reintentos (attempts >= 5) y siguen sin publicar.
     * Los re-drena un scheduler lento aparte; la idempotencia del consumidor evita duplicados.
     */
    @Query(value = """
            SELECT * FROM outbox_events
            WHERE sent_at IS NULL AND attempts >= 5
            ORDER BY created_at ASC
            LIMIT :limit
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<OutboxEvent> findVarados(@Param("limit") int limit);
}
