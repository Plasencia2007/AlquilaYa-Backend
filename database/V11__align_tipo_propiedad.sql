-- ===========================================================================
-- Migración: alinear `tipo_propiedad` al enum canónico TipoPropiedad
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades)
-- Contexto: se unificó la taxonomía de tipos. Antes convivían valores del
--           catálogo (INDIVIDUAL/COMPARTIDO/MINI_DEPTO) y del filtro de
--           búsqueda (CUARTO/ESTUDIO) que no coincidían con el enum
--           {CUARTO_INDIVIDUAL, CUARTO_COMPARTIDO, DEPARTAMENTO, MINI_DEPA,
--            CASA, SUITE}. Este script migra los valores legacy.
-- Idempotente: solo toca filas con valores antiguos.
-- ===========================================================================

\c alquilaya_propiedades

UPDATE propiedades SET tipo_propiedad = 'CUARTO_INDIVIDUAL'
    WHERE tipo_propiedad IN ('INDIVIDUAL', 'CUARTO');

UPDATE propiedades SET tipo_propiedad = 'CUARTO_COMPARTIDO'
    WHERE tipo_propiedad = 'COMPARTIDO';

UPDATE propiedades SET tipo_propiedad = 'MINI_DEPA'
    WHERE tipo_propiedad IN ('MINI_DEPTO', 'MINI-DEPTO');

-- 'ESTUDIO' no tiene equivalente directo en el enum (un estudio se alquila
-- completo como una unidad). Lo tratamos como cuarto individual; ajusta a
-- 'DEPARTAMENTO' si en tu caso un estudio debe pedir distribución.
UPDATE propiedades SET tipo_propiedad = 'CUARTO_INDIVIDUAL'
    WHERE tipo_propiedad = 'ESTUDIO';

-- DEPARTAMENTO, CASA, SUITE, CUARTO_INDIVIDUAL, CUARTO_COMPARTIDO y MINI_DEPA
-- ya son válidos: no se tocan.

-- Verificación (lista los valores resultantes y su conteo):
-- SELECT tipo_propiedad, COUNT(*) FROM propiedades GROUP BY tipo_propiedad ORDER BY 1;
