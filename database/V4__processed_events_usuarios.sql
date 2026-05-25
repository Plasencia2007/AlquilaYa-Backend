-- ===========================================================================
-- Migración: tabla processed_events en BD `postgres` (servicio-usuarios)
-- Servicio: servicio-usuarios   (DB: postgres)
-- Contexto: Ola 2 - idempotencia de consumers Kafka. Cada par
--           (event_id, consumer_name) se registra para evitar reprocesado.
-- ===========================================================================

\c postgres

CREATE TABLE IF NOT EXISTS processed_events (
    event_id      UUID         NOT NULL,
    consumer_name VARCHAR(100) NOT NULL,
    processed_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, consumer_name)
);

-- Índice opcional para purga periódica (TTL 30 días en cron).
CREATE INDEX IF NOT EXISTS idx_processed_events_at
    ON processed_events (processed_at);
