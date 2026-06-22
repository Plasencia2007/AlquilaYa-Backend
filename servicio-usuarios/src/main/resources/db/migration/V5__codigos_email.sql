-- Verificación de correo por CÓDIGO de 6 dígitos (#3): tabla de códigos enviados por email.
-- Mismo modelo que el OTP de WhatsApp pero por canal email. Código guardado hasheado.
-- En dev la crea ddl-auto; este script la deja para prod (Flyway). Idempotente.

CREATE TABLE IF NOT EXISTS codigos_email (
    id               BIGSERIAL PRIMARY KEY,
    email            VARCHAR(255) NOT NULL,
    codigo           VARCHAR(100) NOT NULL,
    fecha_expiracion TIMESTAMP NOT NULL,
    utilizado        BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion   TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_codigo_email ON codigos_email (email);
