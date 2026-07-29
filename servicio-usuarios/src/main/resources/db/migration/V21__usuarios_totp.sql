-- Item 229: autenticacion de dos factores (TOTP / RFC 6238). El secret solo se persiste
-- aqui una vez confirmado (antes de confirmar vive temporalmente en Redis con TTL); nunca
-- se expone en JSON (@JsonIgnore en la entidad Usuario).
ALTER TABLE usuarios
    ADD COLUMN totp_secret VARCHAR(255),
    ADD COLUMN totp_habilitado BOOLEAN NOT NULL DEFAULT FALSE;
