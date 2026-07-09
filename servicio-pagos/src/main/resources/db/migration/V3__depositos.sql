-- G3: garantía / depósito. Libro de vida del depósito de cada reserva: captura, retención,
-- devolución (total/parcial) o pérdida (el arrendador se lo queda por daños).
CREATE TABLE IF NOT EXISTS depositos (
    id BIGSERIAL PRIMARY KEY,
    reserva_id BIGINT NOT NULL,
    arrendador_id BIGINT,
    monto NUMERIC(12,2) NOT NULL,
    monto_devuelto NUMERIC(12,2),
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE, RETENIDO, DEVUELTO, RETENIDO_PARCIAL, PERDIDO
    payment_id VARCHAR(255),
    motivo_retencion TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_depositos_reserva ON depositos (reserva_id);
CREATE INDEX IF NOT EXISTS idx_depositos_arrendador ON depositos (arrendador_id);
CREATE INDEX IF NOT EXISTS idx_depositos_estado ON depositos (estado);
