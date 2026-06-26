-- Fecha de nacimiento del usuario (opcional, ingresada en el perfil personal).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
