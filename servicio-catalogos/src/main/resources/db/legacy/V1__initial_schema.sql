-- =====================================================================
-- V1 — Schema inicial servicio-catalogos (MySQL 8)
--
-- Tablas:
--   items_catalogo  — items configurables por TipoItem (SERVICIO, REGLA,
--                     TIPO_CUARTO, PERIODO_ALQUILER).
--   carreras        — carreras UPeU disponibles para estudiantes.
--
-- NOTA: la data seed (filas iniciales) la inserta DataInitializer al
-- arrancar la aplicación. Esta migración solo crea la estructura.
--
-- Si la BD ya tiene tablas creadas por ddl-auto:update, Flyway con
-- baseline-on-migrate=true las dejará intactas (las CREATE TABLE IF NOT
-- EXISTS aquí son defensivas).
--
-- TODO(consolidación-bd): evaluar mover servicio-catalogos a PostgreSQL
-- para unificar el stack de BD (hoy es la única excepción MySQL).
-- Fuera del alcance de este PR por riesgo alto.
-- =====================================================================

CREATE TABLE IF NOT EXISTS items_catalogo (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    nombre          VARCHAR(120) NOT NULL,
    valor           VARCHAR(60)  NOT NULL,
    tipo            VARCHAR(32)  NOT NULL,
    activo          BIT(1)       DEFAULT b'1',
    icono           VARCHAR(255),
    descripcion     VARCHAR(255),
    fecha_creacion  DATETIME(6),
    PRIMARY KEY (id),
    KEY idx_items_catalogo_tipo (tipo),
    KEY idx_items_catalogo_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS carreras (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    nombre          VARCHAR(150) NOT NULL,
    codigo          VARCHAR(20),
    activo          BIT(1)       NOT NULL DEFAULT b'1',
    fecha_creacion  DATETIME(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_carreras_nombre (nombre),
    KEY idx_carreras_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
