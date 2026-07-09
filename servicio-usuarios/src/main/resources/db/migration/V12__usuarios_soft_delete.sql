-- G8-B: baja de cuenta (GDPR) por anonimización / soft-delete.
-- Se agrega el marcador `eliminado` (+ timestamp) para: (a) filtrar cuentas dadas de
-- baja de los listados y (b) impedir el login de una cuenta anonimizada
-- (AuthController.verificarCuentaHabilitada la rechaza).
--
-- ADITIVO: columnas nuevas nullable/defaulted, no cambia contratos existentes.
-- Idempotente (ADD COLUMN IF NOT EXISTS). Tipos alineados con la entidad Usuario.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS eliminado boolean NOT NULL DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_eliminacion timestamp(6) without time zone;

-- Acelera el filtrado de cuentas activas en los listados admin.
CREATE INDEX IF NOT EXISTS idx_usuarios_eliminado ON usuarios (eliminado);
