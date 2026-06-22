-- ===========================================================================
-- Migración: Confianza — denuncias de publicación (#46) y caducidad de avisos (#49)
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades, PostgreSQL)
-- Contexto:
--   #46 Denuncia: nueva tabla "denuncias" (un usuario reporta una publicación).
--   #49 Caducidad: columnas en "propiedades" para pedir reconfirmación periódica
--       de que el aviso sigue vigente (no destructivo: solo marca una bandera).
--   En dev las crea ddl-auto; este script las deja para prod. Idempotente.
-- ===========================================================================


-- #49 — caducidad / re-confirmación de avisos
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS fecha_ultima_confirmacion TIMESTAMP;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS requiere_reconfirmacion BOOLEAN DEFAULT FALSE;
UPDATE propiedades SET requiere_reconfirmacion = FALSE WHERE requiere_reconfirmacion IS NULL;
-- Avisos existentes: arranca el reloj desde su creación.
UPDATE propiedades SET fecha_ultima_confirmacion = fecha_creacion WHERE fecha_ultima_confirmacion IS NULL;

-- #46 — denuncias de publicación
CREATE TABLE IF NOT EXISTS denuncias (
    id              BIGSERIAL PRIMARY KEY,
    propiedad_id    BIGINT NOT NULL,
    denunciante_id  BIGINT,
    motivo          VARCHAR(20) NOT NULL,
    descripcion     TEXT,
    estado          VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    fecha_creacion  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_denuncia_propiedad ON denuncias (propiedad_id);
CREATE INDEX IF NOT EXISTS idx_denuncia_estado ON denuncias (estado);
