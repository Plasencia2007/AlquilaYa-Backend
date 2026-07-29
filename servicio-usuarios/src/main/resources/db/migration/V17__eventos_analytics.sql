-- #455: sink backend de la telemetría de analítica CLIENTE (ver src/lib/analytics.ts).
--
-- Ingesta pública en batch (POST /api/v1/usuarios/analytics/eventos): visitantes anónimos
-- también generan eventos (p.ej. antes de loguearse), por eso usuario_id es nullable. El
-- payload libre del evento (`props`) se guarda serializado a JSON en `propiedades` (TEXT),
-- sin esquema rígido a propósito -- cada tipo de evento define sus propias props en el
-- frontend.
--
-- session_id es un id anónimo de sesión de navegador (sessionStorage del frontend, no PII).
--
-- Índice (evento, fecha_creacion): soporta el agregado GROUP BY evento, COUNT(*) por rango de
-- fechas que usa GET /api/v1/usuarios/admin/analytics/resumen (y un futuro dashboard admin)
-- sin escanear toda la tabla.
--
-- Sin política de retención/expurgo todavía -- decisión de producto pendiente.
--
-- Dialecto PostgreSQL.

CREATE TABLE IF NOT EXISTS eventos_analytics (
    id              bigserial PRIMARY KEY,
    evento          varchar(150) NOT NULL,
    propiedades     text,
    usuario_id      bigint,
    session_id      varchar(100),
    fecha_creacion  timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evento_analytics_tipo_fecha
    ON eventos_analytics (evento, fecha_creacion);
