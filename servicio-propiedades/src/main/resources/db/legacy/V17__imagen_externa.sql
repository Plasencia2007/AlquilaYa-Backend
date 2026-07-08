-- ===========================================================================
-- Migración: imágenes por URL externa (feature, idea #11+)
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades, PostgreSQL)
-- Contexto: además de subir archivos a Cloudinary, el arrendador puede pegar una
--           URL directa de imagen alojada en otro host. Esas filas se marcan
--           externa=true para NO intentar borrarlas de Cloudinary al eliminarlas.
--           En dev la columna la crea ddl-auto; este script la deja para prod.
-- ===========================================================================


ALTER TABLE propiedad_imagenes ADD COLUMN IF NOT EXISTS externa BOOLEAN NOT NULL DEFAULT FALSE;
