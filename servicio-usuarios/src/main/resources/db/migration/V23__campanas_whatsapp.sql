-- Ítem 381: campañas de WhatsApp a estudiantes segmentados por carrera/estado de cuenta.
-- El envío en sí viaja por Kafka (topic campanas-whatsapp-events, vía la outbox transaccional
-- existente); esta tabla solo guarda la definición de la campaña y su estado de encolado.
CREATE TABLE campanas_whatsapp (
    id               BIGSERIAL PRIMARY KEY,
    carrera          VARCHAR(150),
    estado           VARCHAR(20),
    mensaje          VARCHAR(1000) NOT NULL,
    programado_para  TIMESTAMP,
    estado_envio     VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    destinatarios    INTEGER,
    ultimo_error     TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT now(),
    enviado_at       TIMESTAMP
);

-- Soporta el poll del scheduler: campañas PENDIENTE cuyo programado_para ya venció.
CREATE INDEX idx_campana_whatsapp_pendiente ON campanas_whatsapp (estado_envio, programado_para);
