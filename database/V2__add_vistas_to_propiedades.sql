-- ===========================================================================
-- Migración: agregar columna `vistas` a la tabla `propiedades`
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades)
-- Contexto: rediseño premium de la cartilla de propiedad (Agent 1, backend).
--           El contador se incrementa de forma asíncrona desde el endpoint
--           GET /api/v1/propiedades/{id}/completo para evitar carga sincrónica
--           en el request principal.
-- ===========================================================================

\c alquilaya_propiedades

ALTER TABLE propiedades
    ADD COLUMN IF NOT EXISTS vistas BIGINT NOT NULL DEFAULT 0;

-- Índice opcional para futuras consultas "más vistas / trending".
CREATE INDEX IF NOT EXISTS idx_propiedades_vistas ON propiedades (vistas DESC);
