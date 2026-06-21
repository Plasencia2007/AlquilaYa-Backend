-- ===========================================================================
-- Migración: sub-categorías en reseñas de propiedad (idea #26)
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades, PostgreSQL)
-- Contexto: además del rating general, el estudiante puntúa limpieza, ubicación,
--           precio y trato (1-5). Nullable por compatibilidad con reseñas previas.
--           En dev las columnas las crea ddl-auto; este script las deja para prod.
-- ===========================================================================

\c alquilaya_propiedades

ALTER TABLE resenas_propiedad ADD COLUMN IF NOT EXISTS rating_limpieza  INTEGER;
ALTER TABLE resenas_propiedad ADD COLUMN IF NOT EXISTS rating_ubicacion INTEGER;
ALTER TABLE resenas_propiedad ADD COLUMN IF NOT EXISTS rating_precio    INTEGER;
ALTER TABLE resenas_propiedad ADD COLUMN IF NOT EXISTS rating_trato     INTEGER;
