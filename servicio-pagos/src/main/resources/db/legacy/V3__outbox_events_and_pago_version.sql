-- V3__outbox_events_and_pago_version.sql
-- Ola 2 — servicio-pagos (BD alquilaya_pagos)
-- 1) Tabla outbox_events para patron Transactional Outbox.
-- 2) Columna version en pagos para optimistic locking (@Version).

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

-- Indice parcial: solo eventos pendientes de publicar.
CREATE INDEX IF NOT EXISTS idx_outbox_pending
    ON outbox_events (sent_at, created_at)
    WHERE sent_at IS NULL;

-- Indice por agregado: util para depurar / reconstruir historia.
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate
    ON outbox_events (aggregate_type, aggregate_id);

-- =============================================================
-- 2. pagos.version (optimistic locking - @Version JPA)
-- =============================================================
ALTER TABLE pagos
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
