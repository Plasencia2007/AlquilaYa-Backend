-- Agrega el depósito de garantía a nivel propiedad y el monto mensual por
-- servicio "aparte" (fuera de la renta). Ambos nullable: no rompen filas
-- existentes ni exigen dato en propiedades ya publicadas.

ALTER TABLE propiedades ADD COLUMN deposito NUMERIC(10,2);

ALTER TABLE propiedad_servicios_estado ADD COLUMN monto NUMERIC(10,2);
