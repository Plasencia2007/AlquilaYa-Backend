-- ===========================================================================
-- Migración: tabla de eventos para la analítica del arrendador (#51, #52)
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades, PostgreSQL)
-- Contexto: registra eventos VISTA y CONTACTO sobre las publicaciones para
--   construir la serie de vistas por ventana (#51) y el embudo (#52). Favoritos
--   y reservas se cuentan desde sus propias tablas. En dev la crea ddl-auto;
--   este script la deja para prod. Idempotente.
-- ===========================================================================


CREATE TABLE IF NOT EXISTS eventos_propiedad (
    id              BIGSERIAL PRIMARY KEY,
    propiedad_id    BIGINT NOT NULL,
    tipo            VARCHAR(20) NOT NULL,
    perfil_id       BIGINT,
    fecha_creacion  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evento_prop_tipo_fecha
    ON eventos_propiedad (propiedad_id, tipo, fecha_creacion);
