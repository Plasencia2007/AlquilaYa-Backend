-- Item 226 (Fase 2 multi-universidad): enlaza el perfil academico del estudiante con el
-- catalogo de universidades de servicio-catalogos (id numerico, sin FK real -- las BD estan
-- en motores distintos, Postgres aqui vs MySQL en catalogos; ver CLAUDE.md "FKs entre
-- esquemas no estan enforced en BD").
ALTER TABLE estudiantes ADD COLUMN universidad_id BIGINT;
