-- G1: payout al arrendador. Tabla de desembolsos (agregados por arrendador) + columnas de
-- trazabilidad en pagos (a quién se le debe, y si ya quedó cubierto por un desembolso).
CREATE TABLE IF NOT EXISTS desembolsos (
    id BIGSERIAL PRIMARY KEY,
    arrendador_id BIGINT NOT NULL,
    monto_total NUMERIC(12,2) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE, PROCESADO, FALLIDO
    metodo_pago VARCHAR(50),
    referencia VARCHAR(255),
    motivo_fallo TEXT,
    procesado_por BIGINT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
    fecha_procesado TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_desembolsos_arrendador ON desembolsos (arrendador_id);
CREATE INDEX IF NOT EXISTS idx_desembolsos_estado ON desembolsos (estado);

ALTER TABLE pagos ADD COLUMN IF NOT EXISTS arrendador_id BIGINT NULL;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS desembolso_id BIGINT NULL;
CREATE INDEX IF NOT EXISTS idx_pagos_arrendador_pendiente ON pagos (arrendador_id, estado, desembolso_id);
