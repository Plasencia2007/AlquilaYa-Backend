-- ===========================================================================
-- Migración: tabla processed_events para idempotencia de consumers Kafka
-- Servicio: servicio-mensajeria  (DB: alquilaya_mensajeria, PostgreSQL :5433)
-- Ola 2 — Outbox + Idempotencia + @Version
-- Movida desde servicio-mensajeria/database/V1__processed_events.sql para
-- consolidar todas las migraciones manuales bajo la carpeta /database del repo.
-- ===========================================================================

\c alquilaya_mensajeria

CREATE TABLE IF NOT EXISTS processed_events (
    event_id      UUID         NOT NULL,
    consumer_name VARCHAR(100) NOT NULL,
    processed_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, consumer_name)
);

-- Índice opcional para purga periódica (TTL 30 días en cron).
CREATE INDEX IF NOT EXISTS idx_processed_events_at
    ON processed_events (processed_at);
