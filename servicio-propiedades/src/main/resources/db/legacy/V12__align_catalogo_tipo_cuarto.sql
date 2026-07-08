-- ===========================================================================
-- Migración: alinear los items TIPO_CUARTO del catálogo al enum TipoPropiedad
-- Servicio: servicio-catalogos  (DB: alquilaya_catalogos, MySQL)
-- Contexto: el seed antiguo usaba valores que no coincidían con el enum
--           (INDIVIDUAL/COMPARTIDO/MINI_DEPTO). El DataInitializer ya quedó
--           corregido, pero solo siembra con la tabla vacía; este script
--           arregla una BD existente sin truncarla. Idempotente.
-- ===========================================================================

USE alquilaya_catalogos;

-- 1) Alinear los valores existentes
UPDATE items_catalogo SET valor = 'CUARTO_INDIVIDUAL', nombre = 'Cuarto individual', icono = 'fa-user'
    WHERE tipo = 'TIPO_CUARTO' AND valor = 'INDIVIDUAL';

UPDATE items_catalogo SET valor = 'CUARTO_COMPARTIDO', nombre = 'Cuarto compartido', icono = 'fa-users'
    WHERE tipo = 'TIPO_CUARTO' AND valor = 'COMPARTIDO';

UPDATE items_catalogo SET valor = 'MINI_DEPA', nombre = 'Mini depa', icono = 'fa-home'
    WHERE tipo = 'TIPO_CUARTO' AND valor IN ('MINI_DEPTO', 'MINI-DEPTO');

UPDATE items_catalogo SET nombre = 'Suite', icono = 'fa-star'
    WHERE tipo = 'TIPO_CUARTO' AND valor = 'SUITE';

-- 2) Insertar los que faltan (Departamento y Casa), solo si no existen
INSERT INTO items_catalogo (nombre, valor, tipo, activo, icono, fecha_creacion)
SELECT 'Departamento', 'DEPARTAMENTO', 'TIPO_CUARTO', 1, 'fa-building', NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM items_catalogo WHERE tipo = 'TIPO_CUARTO' AND valor = 'DEPARTAMENTO');

INSERT INTO items_catalogo (nombre, valor, tipo, activo, icono, fecha_creacion)
SELECT 'Casa', 'CASA', 'TIPO_CUARTO', 1, 'fa-house', NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM items_catalogo WHERE tipo = 'TIPO_CUARTO' AND valor = 'CASA');

-- Verificación:
-- SELECT valor, nombre, activo FROM items_catalogo WHERE tipo = 'TIPO_CUARTO' ORDER BY id;
