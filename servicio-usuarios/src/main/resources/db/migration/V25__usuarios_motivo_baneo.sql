-- Persiste el motivo real de un baneo (hasta ahora el panel admin de baneos activos
-- ("reports/active-bans/page.tsx") siempre mostraba "No especificado" porque banear un
-- usuario no pedía ni guardaba ningún motivo.
--
-- motivo_baneo: nullable a propósito -- no todo cambio de estado necesita motivo (solo el
--   baneo lo pide desde el frontend), y los baneos existentes antes de esta migración no
--   tienen motivo histórico que rellenar.
--
-- Dialecto PostgreSQL.

ALTER TABLE usuarios ADD COLUMN motivo_baneo VARCHAR(500);
