-- Migración manual: Estudiante.carrera (VARCHAR) -> Estudiante.carrera_id (BIGINT)
-- Ejecutar en la BD de servicio-usuarios (PostgreSQL, esquema alquilaya_usuarios) ANTES
-- de iniciar el servicio con el nuevo modelo. Hibernate (ddl-auto=update) NO migra el
-- tipo de columna automáticamente.
--
-- Pasos:
-- 1) Asegurarse de que servicio-catalogos ya creó la tabla `carreras` y la sembró.
-- 2) Ejecutar este script con: psql -U postgres -d <db_usuarios> -f V_manual__migrate_carrera_to_carrera_id.sql
-- 3) (Opcional) Si tienes filas con `carrera` en texto, mapearlas manualmente a un id
--    válido del catálogo antes del DROP COLUMN.
-- 4) Iniciar servicio-usuarios.

ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS carrera_id BIGINT;

-- Si tienes datos existentes y quieres mapearlos por nombre (ajusta los matches según tu data):
-- UPDATE estudiantes SET carrera_id = 1 WHERE LOWER(carrera) LIKE '%administraci%';
-- UPDATE estudiantes SET carrera_id = 2 WHERE LOWER(carrera) LIKE '%contabilidad%';
-- UPDATE estudiantes SET carrera_id = 4 WHERE LOWER(carrera) LIKE '%sistemas%';
-- ... (etc.)

ALTER TABLE estudiantes DROP COLUMN IF EXISTS carrera;
