-- Tipo de login de la cuenta (LOCAL = email+password, GOOGLE = OAuth).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tipo_login VARCHAR(20) NOT NULL DEFAULT 'LOCAL';

-- Backfill: las cuentas creadas por Google usan el DNI placeholder '00000000'.
UPDATE usuarios SET tipo_login = 'GOOGLE' WHERE dni = '00000000';
