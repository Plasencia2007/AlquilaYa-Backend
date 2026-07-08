-- ===========================================================================
-- Migración: política de cancelación por propiedad (idea #21)
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades, PostgreSQL)
-- Contexto: cada propiedad define FLEXIBLE/MODERADA/ESTRICTA. Al cancelar una
--           reserva PAGADA, solo se emite el reembolso si la cancelación ocurre con
--           suficiente anticipación al check-in (0/7/30 días). Default FLEXIBLE para
--           preservar el comportamiento previo (reembolso 100%). En dev la columna la
--           crea ddl-auto; este script la deja para prod.
-- ===========================================================================


ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS politica_cancelacion VARCHAR(20) DEFAULT 'FLEXIBLE';
UPDATE propiedades SET politica_cancelacion = 'FLEXIBLE' WHERE politica_cancelacion IS NULL;
