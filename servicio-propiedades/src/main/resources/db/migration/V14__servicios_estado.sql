-- ===========================================================================
-- Migración: servicios con estado (incluido / aparte / no disponible)
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades, PostgreSQL)
-- Contexto: los servicios pasan de lista plana a lista con estado. La columna
--           serviciosIncluidos se mantiene (derivada de los INCLUIDO) para la
--           búsqueda. En dev la tabla la crea ddl-auto; esto la deja para prod.
-- ===========================================================================


CREATE TABLE IF NOT EXISTS propiedad_servicios_estado (
    propiedad_id BIGINT NOT NULL,
    servicio     VARCHAR(255),
    estado       VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_prop_servicios_estado ON propiedad_servicios_estado (propiedad_id);
