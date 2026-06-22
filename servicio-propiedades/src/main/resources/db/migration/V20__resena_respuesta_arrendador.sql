-- ===========================================================================
-- Migración: respuesta del arrendador a reseñas de propiedad (idea #27)
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades, PostgreSQL)
-- Contexto: el arrendador dueño puede responder públicamente una reseña de su
--           propiedad (estilo Airbnb). Nullable = sin responder. En dev las
--           columnas las crea ddl-auto; este script las deja para prod.
-- ===========================================================================


ALTER TABLE resenas_propiedad ADD COLUMN IF NOT EXISTS respuesta_arrendador TEXT;
ALTER TABLE resenas_propiedad ADD COLUMN IF NOT EXISTS fecha_respuesta TIMESTAMP;
