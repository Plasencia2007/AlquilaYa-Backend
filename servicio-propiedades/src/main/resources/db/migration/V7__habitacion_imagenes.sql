-- Fotos propias de cada habitación (cuarto) en propiedades gestionadas por habitaciones.
-- No comparten las fotos generales de la propiedad (propiedad_imagenes); cada cuarto
-- tiene su propia lista ordenada de URLs (#167).

CREATE TABLE IF NOT EXISTS public.habitacion_imagenes (
    habitacion_id bigint NOT NULL,
    posicion integer NOT NULL,
    url character varying(512),
    CONSTRAINT habitacion_imagenes_pkey PRIMARY KEY (habitacion_id, posicion),
    CONSTRAINT fk_habitacion_imagenes_habitacion FOREIGN KEY (habitacion_id)
        REFERENCES public.habitaciones (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_habitacion_imagenes_habitacion_id
    ON public.habitacion_imagenes (habitacion_id);
