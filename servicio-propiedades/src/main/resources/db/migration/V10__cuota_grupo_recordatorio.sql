-- Agrega el timestamp del último recordatorio de WhatsApp empujado a un miembro moroso de
-- una reserva grupal (ítem 281): el botón "Recordar" valida un cooldown de 24h contra esta
-- columna para evitar spam al mismo estudiante. Nullable: cuotas existentes no tienen
-- recordatorio previo.

ALTER TABLE cuotas_grupo ADD COLUMN IF NOT EXISTS ultimo_recordatorio_at TIMESTAMP(6) WITHOUT TIME ZONE;
