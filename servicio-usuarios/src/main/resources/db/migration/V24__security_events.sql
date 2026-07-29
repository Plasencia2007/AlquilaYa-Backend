-- Ítem 351: tabla de lectura para las alertas de seguridad publicadas a Kafka
-- (topic `user-security-events`, productor: UserEventProducer#emitirAlertaIntentosFallidos).
--
-- Hasta ahora nadie consumía ese topic: los eventos USER_INTENTOS_FALLIDOS se publicaban y se
-- perdían. Esta tabla es el sink que persiste cada evento (vía SecurityEventListener,
-- @KafkaListener del mismo servicio-usuarios) para que el panel admin de alertas
-- (GET /api/v1/usuarios/admin/security-events) pueda listarlos.
--
-- tipo: eventType del envelope canónico (ej. "USER_INTENTOS_FALLIDOS").
-- usuario_id: nullable -- el productor puede emitir 0 si no resolvió el usuario (ver
--   emitirAlertaIntentosFallidos, que normaliza null a 0L); igual se deja nullable aquí por
--   si un futuro evento de seguridad no tiene usuario asociado (ej. intento con correo inexistente).
-- detalle: payload del evento serializado a JSON (TEXT), sin esquema rígido a propósito --
--   mismo patrón que eventos_analytics.propiedades (migración V17).
--
-- Índice (fecha) para el filtro/orden por rango de fechas del panel admin sin escanear toda la tabla.
--
-- Dialecto PostgreSQL.

CREATE TABLE IF NOT EXISTS security_events (
    id          bigserial PRIMARY KEY,
    tipo        varchar(150) NOT NULL,
    usuario_id  bigint,
    detalle     text,
    fecha       timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_fecha
    ON security_events (fecha DESC);
