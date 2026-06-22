-- ===========================================================================
-- Migración: unicidad de reseñas (una por estudiante/objetivo)
-- Servicio: servicio-propiedades  (DB: alquilaya_propiedades)
-- Contexto: el backend no bloqueaba reseñas duplicadas de propiedad ni de
--           arrendador. Primero se deduplica (se conserva la más reciente,
--           id más alto, de cada par) y luego se agregan los constraints
--           únicos que también declaran las entidades JPA.
-- Nota: si se eliminan duplicados, el promedio cacheado en propiedades
--       (calificacion/num_resenas) se recalcula solo con la próxima reseña
--       u ocultamiento; no se recalcula aquí.
-- ===========================================================================


-- Dedupe: conservar la reseña más reciente de cada par
DELETE FROM resenas_propiedad a
USING resenas_propiedad b
WHERE a.estudiante_id = b.estudiante_id
  AND a.propiedad_id = b.propiedad_id
  AND a.id < b.id;

DELETE FROM resenas_arrendador a
USING resenas_arrendador b
WHERE a.estudiante_id = b.estudiante_id
  AND a.arrendador_id = b.arrendador_id
  AND a.id < b.id;

DELETE FROM resenas_estudiante a
USING resenas_estudiante b
WHERE a.arrendador_id = b.arrendador_id
  AND a.estudiante_id = b.estudiante_id
  AND a.id < b.id;

-- Constraints únicos (idempotente: solo si no existen ya)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_resena_prop_estudiante_propiedad') THEN
        ALTER TABLE resenas_propiedad
            ADD CONSTRAINT uk_resena_prop_estudiante_propiedad UNIQUE (estudiante_id, propiedad_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_resena_arr_estudiante_arrendador') THEN
        ALTER TABLE resenas_arrendador
            ADD CONSTRAINT uk_resena_arr_estudiante_arrendador UNIQUE (estudiante_id, arrendador_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_resena_est_arrendador_estudiante') THEN
        ALTER TABLE resenas_estudiante
            ADD CONSTRAINT uk_resena_est_arrendador_estudiante UNIQUE (arrendador_id, estudiante_id);
    END IF;
END $$;
