-- Motivo de rechazo (ítem 348): cuando un admin rechaza una propiedad puede indicar por qué.
-- Se muestra en "Mis propiedades" del arrendador para que sepa qué corregir antes de reenviarla.
-- Nullable: propiedades nunca rechazadas, o rechazos antiguos sin motivo, quedan en NULL.

ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS motivo_rechazo VARCHAR(500);
