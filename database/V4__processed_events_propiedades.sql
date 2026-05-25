-- ===========================================================================
-- Migración: crear tabla processed_events para idempotencia de consumers Kafka
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades)
-- Ola 2 — Outbox + Idempotencia + @Version
-- ===========================================================================

\c alquilaya_propiedades

CREATE TABLE IF NOT EXISTS processed_events (
    event_id      UUID         NOT NULL,
    consumer_name VARCHAR(100) NOT NULL,
    processed_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, consumer_name)
);

-- Índice opcional para purga periódica (TTL 30 días en cron).
CREATE INDEX IF NOT EXISTS idx_processed_events_at
    ON processed_events (processed_at);
