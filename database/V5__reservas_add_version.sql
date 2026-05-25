-- ===========================================================================
-- Migración: agregar columna version (optimistic locking) a reservas
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades)
-- Ola 2 — Outbox + Idempotencia + @Version
-- ===========================================================================

\c alquilaya_propiedades

ALTER TABLE reservas
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
