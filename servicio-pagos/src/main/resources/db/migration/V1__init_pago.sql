-- V1__init_pago.sql
-- Tabla base "pagos". Idempotente: solo crea si no existe.
-- En entornos con ddl-auto=update Hibernate ya creó la tabla; este script no la pisa.

CREATE TABLE IF NOT EXISTS pagos (
    id              BIGSERIAL PRIMARY KEY,
    reserva_id      BIGINT NOT NULL,
    preferencia_id  VARCHAR(255),
    payment_id      VARCHAR(255),
    monto           NUMERIC(19, 2),
    estado          VARCHAR(50),
    fecha_creacion  TIMESTAMP,
    fecha_pago      TIMESTAMP
);
