-- G4: aceptación electrónica del contrato (placeholder de firma — NO es firma criptográfica,
-- es un timestamp de "aceptó los términos" por cada parte). Nullable: reservas viejas sin firmar.
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS firma_estudiante_at TIMESTAMP NULL;
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS firma_arrendador_at TIMESTAMP NULL;
