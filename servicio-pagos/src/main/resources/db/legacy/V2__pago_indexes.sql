-- V2__pago_indexes.sql
-- Índices y constraint UNIQUE en pagos.
-- payment_id es NULLABLE; Postgres permite múltiples NULL en UNIQUE,
-- por lo tanto pagos PENDIENTES (sin paymentId) NO rompen la restricción.

CREATE INDEX IF NOT EXISTS idx_pago_reserva
    ON pagos (reserva_id);

CREATE INDEX IF NOT EXISTS idx_pago_preferencia
    ON pagos (preferencia_id);

CREATE INDEX IF NOT EXISTS idx_pago_payment
    ON pagos (payment_id);

-- ADD CONSTRAINT en Postgres no soporta IF NOT EXISTS directamente;
-- usamos un DO block para hacerlo idempotente.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_pago_payment_id'
    ) THEN
        ALTER TABLE pagos
            ADD CONSTRAINT uk_pago_payment_id UNIQUE (payment_id);
    END IF;
END$$;
