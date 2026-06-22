-- Verificación de correo (#3): nueva columna email_verificado en usuarios.
-- Los usuarios existentes se consideran verificados (grandfathering) para no
-- forzarlos a re-verificar; los nuevos registros entran como false y verifican
-- por el link enviado al correo (Google entra ya como true desde el código).

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE usuarios SET email_verificado = TRUE WHERE email_verificado = FALSE;
