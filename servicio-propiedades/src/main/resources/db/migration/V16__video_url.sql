-- ===========================================================================
-- Migración: enlace de video de la propiedad (feature "tour/video", idea #12)
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades, PostgreSQL)
-- Contexto: el arrendador pega un enlace (YouTube/Vimeo/.mp4) que se embebe en la
--           ficha. Se valida/normaliza en el backend. En dev la columna la crea
--           ddl-auto; este script la deja para prod.
-- ===========================================================================


ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS video_url VARCHAR(512);
