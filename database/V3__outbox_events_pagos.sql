-- ===========================================================================
-- Migración: tabla outbox_events + columna pagos.version (optimistic locking)
-- Servicio: servicio-pagos  (DB: alquilaya_pagos, PostgreSQL :5433)
-- Ola 2 — Outbox + Idempotencia + @Version
--
-- NOTA — DUPLICACIÓN INTENCIONAL:
--   El archivo canónico vive en
--     servicio-pagos/src/main/resources/db/migration/V3__outbox_events_and_pago_version.sql
--   donde Flyway lo aplica automáticamente cuando FLYWAY_ENABLED=true.
--   Esta copia existe sólo para que el operador que aplica el conjunto
--   /database manualmente con psql tenga la migración a mano sin tener que
--   navegar al subdirectorio del servicio.
--   Si modificas una, sincroniza la otra.
-- ===========================================================================

\c alquilaya_pagos

-- =============================================================
-- 1. outbox_events
-- =============================================================
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

CREATE INDEX IF NOT EXISTS idx_outbox_pending
    ON outbox_events (sent_at, created_at)
    WHERE sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_outbox_aggregate
    ON outbox_events (aggregate_type, aggregate_id);

-- =============================================================
-- 2. pagos.version (optimistic locking - @Version JPA)
-- =============================================================
ALTER TABLE pagos
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
