-- ===========================================================================
-- Migración: crear tabla saga_reserva_pago (orquestador Saga, preparada Ola 3)
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades)
-- Ola 2 — Cimiento para Ola 3 (vacía durante Ola 1-2).
-- ===========================================================================

\c alquilaya_propiedades

CREATE TABLE IF NOT EXISTS saga_reserva_pago (
    saga_id       UUID         PRIMARY KEY,
    reserva_id    BIGINT       NOT NULL,
    estado_saga   VARCHAR(50)  NOT NULL,
    paso_actual   VARCHAR(50)  NOT NULL,
    intentos      INT          NOT NULL DEFAULT 0,
    payload       TEXT,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    completed_at  TIMESTAMP    NULL,
    ultimo_error  TEXT         NULL,
    version       BIGINT       NOT NULL DEFAULT 0
);

-- Sólo se indexan las sagas en curso.
CREATE INDEX IF NOT EXISTS idx_saga_estado
    ON saga_reserva_pago (estado_saga)
    WHERE completed_at IS NULL;

-- Soporta búsquedas frecuentes "saga vigente para esta reserva".
CREATE INDEX IF NOT EXISTS idx_saga_reserva
    ON saga_reserva_pago (reserva_id);
