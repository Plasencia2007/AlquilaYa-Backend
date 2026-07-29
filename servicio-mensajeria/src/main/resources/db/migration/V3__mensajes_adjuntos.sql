-- Ítem 254: soporte de imágenes adjuntas en el chat. Generaliza `mensajes` para
-- distinguir TEXTO (comportamiento histórico) de IMAGEN, sin tocar el modelo de
-- conversaciones ni datos existentes (los mensajes previos quedan como TEXTO).

ALTER TABLE mensajes
    ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'TEXTO',
    ADD COLUMN url_adjunto VARCHAR(500);

ALTER TABLE mensajes
    ADD CONSTRAINT mensajes_tipo_check
        CHECK (tipo IN ('TEXTO', 'IMAGEN'));
