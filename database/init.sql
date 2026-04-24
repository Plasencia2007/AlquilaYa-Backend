-- Crear las bases de datos de AlquilaYa en PostgreSQL
-- (la DB 'postgres' la crea POSTGRES_DB en docker-compose)

SELECT 'CREATE DATABASE alquilaya_propiedades'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'alquilaya_propiedades')\gexec

SELECT 'CREATE DATABASE alquilaya_pagos'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'alquilaya_pagos')\gexec
