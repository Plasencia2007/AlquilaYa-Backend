-- =====================================================================
-- V2: índice compuesto (latitud, longitud) para la búsqueda geoespacial
-- "cerca de mí" (G6). El endpoint GET /api/v1/propiedades/buscar/cerca
-- pre-filtra con un bounding box (latitud/longitud BETWEEN ...) antes de
-- refinar por distancia Haversine exacta; este índice permite que ese
-- pre-filtro use un index scan en lugar de un seq scan.
--
-- Idempotente (IF NOT EXISTS): seguro de re-ejecutar y compatible con el
-- entorno dev donde ddl-auto=update ya creó la tabla.
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_propiedades_latlng
    ON public.propiedades (latitud, longitud);
