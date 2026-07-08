-- ===========================================================================
-- Migración: agregar columna version (optimistic locking) a propiedades
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades)
-- Ola 2 — Outbox + Idempotencia + @Version
-- ===========================================================================


ALTER TABLE propiedades
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
