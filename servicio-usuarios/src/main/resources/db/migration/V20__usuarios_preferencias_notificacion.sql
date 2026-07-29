-- Item 210: preferencias de notificacion por categoria. Mensajes y reservas empiezan
-- habilitados (comportamiento actual, sin sorpresas); marketing es opt-in explicito.
ALTER TABLE usuarios
    ADD COLUMN notificar_mensajes BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN notificar_reservas BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN notificar_marketing BOOLEAN NOT NULL DEFAULT FALSE;
