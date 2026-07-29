-- Timestamp (reloj del servidor) de aceptación de los Términos y condiciones / Política de
-- privacidad al registrarse (ítem 185, cobertura legal). NULL en cuentas creadas antes de esta
-- columna o por vías que no pasan por el checkbox del wizard de registro (p. ej. /register-admin).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS acepta_terminos_en TIMESTAMP;
