-- ===========================================================================
-- Migración: precio anterior (para el badge automático REBAJA)
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades, PostgreSQL)
-- Contexto: los badges (nuevo/popular/última plaza/rebaja) se CALCULAN al leer,
--           no se almacenan. El único dato nuevo que requieren es el precio previo:
--           se setea al bajar el precio y se limpia al subirlo. En dev la columna
--           la crea ddl-auto; este script la deja para prod.
-- ===========================================================================

\c alquilaya_propiedades

ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS precio_anterior NUMERIC(38, 2);
-- Momento de la última bajada: permite que el badge REBAJA expire (no es eterno).
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS fecha_cambio_precio TIMESTAMP;
