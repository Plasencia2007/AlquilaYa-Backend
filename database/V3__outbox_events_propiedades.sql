-- ===========================================================================
-- Migración: crear tabla outbox_events para el patrón Transactional Outbox
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades)
-- Ola 2 — Outbox + Idempotencia + @Version
-- ===========================================================================

\c alquilaya_propiedades

CREATE TABLE IF NOT EXISTS outbox_events (
    id              BIGSERIAL    PRIMARY KEY,
    event_id        UUID         NOT NULL UNIQUE,
    aggregate_type  VARCHAR(50)  NOT NULL,
    aggregate_id    VARCHAR(100) NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    topic           VARCHAR(100) NOT NULL,
    payload         TEXT         NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    sent_at         TIMESTAMP    NULL,
    attempts        INT          NOT NULL DEFAULT 0,
    last_error      TEXT         NULL
);

-- Índice parcial: solo eventos pendientes de publicar.
CREATE INDEX IF NOT EXISTS idx_outbox_pending
    ON outbox_events (sent_at, created_at)
    WHERE sent_at IS NULL;

-- Índice por agregado: útil para depurar / reconstruir historia.
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate
    ON outbox_events (aggregate_type, aggregate_id);
