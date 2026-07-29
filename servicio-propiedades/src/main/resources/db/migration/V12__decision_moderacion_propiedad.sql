-- Historial de decisiones de moderación de propiedades (ítem 366): auditoría append-only de
-- cada aprobación/rechazo que un admin ejecuta desde AdminPropiedadController (aprobar/rechazar).
-- `propiedad_titulo` va denormalizado (mismo patrón que `denuncias` → DenunciaDTO) para que el
-- historial siga siendo legible aunque la propiedad se borre después. `admin_id` es nullable a
-- propósito: el registro de auditoría nunca debe bloquear la decisión real (ver
-- AdminPropiedadController#registrarDecisionSilenciosa), así que la fila se guarda igual aunque
-- el contexto de seguridad no traiga un id resoluble.

CREATE TABLE IF NOT EXISTS decisiones_moderacion_propiedad (
    id BIGSERIAL PRIMARY KEY,
    propiedad_id BIGINT NOT NULL,
    propiedad_titulo VARCHAR(255) NOT NULL,
    admin_id BIGINT,
    decision VARCHAR(20) NOT NULL,
    motivo VARCHAR(500),
    fecha TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decision_moderacion_propiedad ON decisiones_moderacion_propiedad (propiedad_id);
CREATE INDEX IF NOT EXISTS idx_decision_moderacion_fecha ON decisiones_moderacion_propiedad (fecha);
