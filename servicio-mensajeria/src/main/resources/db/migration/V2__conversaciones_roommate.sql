-- Soporte de conversaciones estudiante-estudiante (roommates). Generaliza
-- `conversaciones`, que hasta ahora asumía siempre un estudiante y un arrendador,
-- sin tocar el modelo/datos existentes de esa relación.

ALTER TABLE conversaciones
    ADD COLUMN tipo VARCHAR(30) NOT NULL DEFAULT 'ESTUDIANTE_ARRENDADOR',
    ADD COLUMN estudiante2_id BIGINT,
    ALTER COLUMN arrendador_id DROP NOT NULL,
    ALTER COLUMN propiedad_id DROP NOT NULL;

ALTER TABLE conversaciones
    ADD CONSTRAINT conversaciones_tipo_check
        CHECK (tipo IN ('ESTUDIANTE_ARRENDADOR', 'ROOMMATE'));

-- Invariante por tipo: ESTUDIANTE_ARRENDADOR conserva arrendador_id/propiedad_id
-- obligatorios y sin segundo estudiante; ROOMMATE exige un segundo estudiante
-- distinto del primero y no tiene arrendador ni propiedad.
ALTER TABLE conversaciones
    ADD CONSTRAINT chk_conversacion_participantes CHECK (
        (tipo = 'ESTUDIANTE_ARRENDADOR' AND arrendador_id IS NOT NULL
            AND propiedad_id IS NOT NULL AND estudiante2_id IS NULL)
        OR
        (tipo = 'ROOMMATE' AND arrendador_id IS NULL AND propiedad_id IS NULL
            AND estudiante2_id IS NOT NULL AND estudiante2_id <> estudiante_id)
    );

-- Idempotencia de creación para roommates: el service siempre guarda la pareja
-- en orden canónico (menor, mayor) antes de insertar, así este índice único
-- parcial evita duplicar la misma pareja sin importar quién la inicia.
CREATE UNIQUE INDEX uk_conversacion_roommate
    ON conversaciones (estudiante_id, estudiante2_id)
    WHERE tipo = 'ROOMMATE';

CREATE INDEX idx_conv_estudiante2_actividad
    ON conversaciones (estudiante2_id, fecha_ultima_actividad DESC)
    WHERE tipo = 'ROOMMATE';
