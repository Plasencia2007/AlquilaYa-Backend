-- Ítem 292: sistema de cupones de descuento. Diseño deliberadamente conservador: un cupón SOLO
-- puede descontar la comisión de plataforma (nunca el monto que recibe el arrendador) — así un
-- bug de cupón nunca puede shortchange-ar a un tercero, en el peor caso AlquilaYa cobra menos
-- comisión de la que hubiera cobrado.
CREATE TABLE IF NOT EXISTS cupones (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(40) NOT NULL,
    tipo_descuento VARCHAR(20) NOT NULL, -- PORCENTAJE, MONTO_FIJO, COMISION_GRATIS
    valor NUMERIC(12,2), -- % (0-100) si PORCENTAJE, S/ si MONTO_FIJO, null si COMISION_GRATIS
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    usos_maximos INTEGER, -- null = ilimitado
    usos_actuales INTEGER NOT NULL DEFAULT 0,
    monto_minimo NUMERIC(12,2), -- null = sin mínimo
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uk_cupon_codigo UNIQUE (codigo)
);
CREATE INDEX IF NOT EXISTS idx_cupones_activo ON cupones (activo);

ALTER TABLE pagos ADD COLUMN IF NOT EXISTS cupon_id BIGINT NULL;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS cupon_codigo VARCHAR(40) NULL;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS monto_descuento NUMERIC(12,2) NULL;
