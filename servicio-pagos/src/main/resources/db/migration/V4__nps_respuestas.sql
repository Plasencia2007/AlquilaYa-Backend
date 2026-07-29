-- Item 298: encuesta NPS post-transacción. Una fila por respuesta enviada (el frontend evita
-- reinsistir vía localStorage, ver components/shared/nps-widget.tsx en el frontend).
CREATE TABLE IF NOT EXISTS nps_respuestas (
    id BIGSERIAL PRIMARY KEY,
    reserva_id BIGINT NOT NULL,
    score SMALLINT NOT NULL,
    comentario TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nps_reserva ON nps_respuestas (reserva_id);
