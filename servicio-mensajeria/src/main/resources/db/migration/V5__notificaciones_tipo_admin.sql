-- Notificaciones admin (gap #2/3 del panel de notificaciones): agrega DENUNCIA_NUEVA y
-- PROPIEDAD_PENDIENTE al CHECK de notificaciones.tipo, consumidos por el nuevo
-- PropiedadEventConsumer (topic propiedades-topic, eventos DENUNCIA_CREADA y
-- PROPIEDAD_PENDIENTE).
--
-- De paso corrige un gap preexistente: DOCUMENTO_NUEVO (ítem 378, notif admin de
-- "documento nuevo") se agregó al enum Java TipoNotificacion pero nunca se sumó a este
-- CHECK en V1__baseline_schema.sql. En dev (ddl-auto=update) nunca se notó porque
-- Hibernate no gestiona CHECK constraints; en un entorno con este baseline aplicado por
-- Flyway, insertar una notificación DOCUMENTO_NUEVO habría violado la constraint.

ALTER TABLE public.notificaciones DROP CONSTRAINT notificaciones_tipo_check;

ALTER TABLE public.notificaciones ADD CONSTRAINT notificaciones_tipo_check
    CHECK (((tipo)::text = ANY ((ARRAY[
        'RESERVA_APROBADA'::character varying,
        'RESERVA_RECHAZADA'::character varying,
        'RESERVA_PAGADA'::character varying,
        'RESERVA_CANCELADA'::character varying,
        'MENSAJE_NUEVO'::character varying,
        'DOCUMENTO_APROBADO'::character varying,
        'DOCUMENTO_RECHAZADO'::character varying,
        'BIENVENIDA'::character varying,
        'RECORDATORIO_PAGO'::character varying,
        'ALERTA_ZONA'::character varying,
        'SISTEMA'::character varying,
        'DOCUMENTO_NUEVO'::character varying,
        'DENUNCIA_NUEVA'::character varying,
        'PROPIEDAD_PENDIENTE'::character varying
    ])::text[])));
