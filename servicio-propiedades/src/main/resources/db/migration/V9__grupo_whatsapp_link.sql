-- Agrega el link de grupo de WhatsApp a grupos_roommate (ítem 221, alternativa de bajo
-- costo al chat grupal): el modelo de conversación de servicio-mensajeria es estrictamente
-- 1-a-1, así que en vez de un chat grupal nuevo, el creador comparte aquí el link de un
-- grupo de WhatsApp que él mismo crea externamente en la app. Nullable: no rompe grupos
-- existentes ni exige el dato.

ALTER TABLE grupos_roommate ADD COLUMN IF NOT EXISTS link_whatsapp VARCHAR(500);
