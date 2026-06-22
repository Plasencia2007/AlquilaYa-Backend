-- Configuración de autenticación (#3): método de verificación elegible por el admin.
-- Fila única (id=1). Se siembra con WHATSAPP_OTP para preservar el comportamiento
-- histórico (no romper logins existentes).

CREATE TABLE IF NOT EXISTS configuracion_auth (
    id                  BIGINT PRIMARY KEY,
    metodo_verificacion VARCHAR(20) NOT NULL,
    fecha_actualizacion TIMESTAMP
);

INSERT INTO configuracion_auth (id, metodo_verificacion, fecha_actualizacion)
VALUES (1, 'WHATSAPP_OTP', NOW())
ON CONFLICT (id) DO NOTHING;
