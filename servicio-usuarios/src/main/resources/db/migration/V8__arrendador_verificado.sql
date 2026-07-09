-- KYC del arrendador (U3): flag "verificado" (true cuando un admin aprueba sus documentos DNI).
-- Antes solo el estudiante tenía verificación real; el arrendador la fingía como estado=ACTIVE.
ALTER TABLE arrendadores ADD COLUMN IF NOT EXISTS verificado BOOLEAN NOT NULL DEFAULT FALSE;
