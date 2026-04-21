-- Crear la base de datos para servicio-propiedades
-- (la DB 'postgres' ya es creada por POSTGRES_DB en docker-compose)
SELECT 'CREATE DATABASE alquilaya_propiedades'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'alquilaya_propiedades')\gexec
