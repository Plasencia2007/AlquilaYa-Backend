-- Tabla de tokens JWT revocados (blacklist).
-- Almacena el hash SHA-256 del token para no persistir el JWT en claro.
-- Los registros con expiration en el pasado pueden limpiarse periódicamente.

CREATE TABLE IF NOT EXISTS token_blacklist (
    id          BIGSERIAL PRIMARY KEY,
    token_hash  VARCHAR(64) UNIQUE NOT NULL,
    expiration  TIMESTAMP   NOT NULL,
    created_at  TIMESTAMP   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash ON token_blacklist(token_hash);
