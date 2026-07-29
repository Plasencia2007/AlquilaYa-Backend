-- #99/#492: amplía los criterios de las suscripciones a alertas de nuevas propiedades.
--
-- Además de zona/universidad/precioMax, una suscripción puede afinar por:
--   - tipo_propiedad  (nombre del enum TipoPropiedad; NULL = no filtra)
--   - dormitorios_min (mínimo de dormitorios de la propiedad; NULL = no filtra)
--   - capacidad_min   (mínimo de personas/capacidad; NULL = no filtra)
--   - servicios        (subset: la propiedad debe ofrecerlos TODOS; vacío = no filtra),
--                       modelado como @ElementCollection en su propia tabla.
--
-- El matching (SuscripcionAlertaRepository.findCoincidencias) resuelve los criterios escalares en
-- JPQL con null-guards (IS NULL OR ...) y el subset de `servicios` en Java sobre la colección ya
-- cargada con LEFT JOIN FETCH (evita N+1). Datos ausentes en el evento se tratan de forma
-- conservadora (la comparación queda UNKNOWN -> la suscripción que exige ese criterio no encaja).
--
-- Idempotente (ADD COLUMN / CREATE TABLE ... IF NOT EXISTS): en dev el esquema lo crea
-- ddl-auto=update a partir de la entidad SuscripcionAlerta; en prod lo crea esta migración
-- (Flyway + validate). Tipos alineados con la entidad JPA. Dialecto PostgreSQL.

ALTER TABLE suscripciones_alerta ADD COLUMN IF NOT EXISTS tipo_propiedad  varchar(100);
ALTER TABLE suscripciones_alerta ADD COLUMN IF NOT EXISTS dormitorios_min integer;
ALTER TABLE suscripciones_alerta ADD COLUMN IF NOT EXISTS capacidad_min   integer;

-- Colección de servicios exigidos (@ElementCollection, Set<String>). Sin PK, alineado con las
-- otras element collections del servicio (p.ej. estudiante_intereses): la columna es nullable.
CREATE TABLE IF NOT EXISTS suscripcion_alerta_servicios (
    suscripcion_id bigint NOT NULL,
    servicio       varchar(255)
);

-- FK a la suscripción dueña (idempotente vía guard: Postgres < 15 no soporta IF NOT EXISTS aquí).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_suscripcion_alerta_servicios'
          AND table_name = 'suscripcion_alerta_servicios'
    ) THEN
        ALTER TABLE suscripcion_alerta_servicios
            ADD CONSTRAINT fk_suscripcion_alerta_servicios
            FOREIGN KEY (suscripcion_id) REFERENCES suscripciones_alerta (id);
    END IF;
END $$;

-- Índice del JOIN FETCH del matching (recupera los servicios por suscripción candidata).
CREATE INDEX IF NOT EXISTS idx_suscripcion_alerta_servicios_sub
    ON suscripcion_alerta_servicios (suscripcion_id);
