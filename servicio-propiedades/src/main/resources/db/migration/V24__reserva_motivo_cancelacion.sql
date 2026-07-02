-- ===========================================================================
-- Migración: agregar columna motivo_cancelacion a la tabla reservas (#20)
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades, PostgreSQL)
-- Contexto: guarda el motivo descriptivo por el cual un estudiante (o el
--   arrendador) cancela una reserva activa.
-- ===========================================================================

ALTER TABLE reservas ADD COLUMN motivo_cancelacion TEXT;
