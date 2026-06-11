-- ===========================================================================
-- Migración: backfill one-time de estudiantes.verificado
-- Servicio: servicio-usuarios  (DB: postgres)
-- Contexto: hasta este fix, aprobar documentos no actualizaba el flag
--           Estudiante.verificado. Marca verificado=true a los estudiantes
--           que ya tienen DNI_FRONTAL y DNI_REVERSO APROBADOS.
--           No inserta en outbox_events (sin notificaciones retroactivas).
-- Ejecutar ANTES de desplegar el bloqueo de reservas en servicio-propiedades.
-- ===========================================================================

\c postgres

UPDATE estudiantes e
SET verificado = TRUE
FROM usuarios u
WHERE u.id = e.usuario_id
  AND u.rol = 'ESTUDIANTE'
  AND e.verificado = FALSE
  AND EXISTS (SELECT 1 FROM documentos_verificacion d
              WHERE d.usuario_id = u.id
                AND d.tipo_documento = 'DNI_FRONTAL'
                AND d.estado_verificacion = 'APROBADO')
  AND EXISTS (SELECT 1 FROM documentos_verificacion d
              WHERE d.usuario_id = u.id
                AND d.tipo_documento = 'DNI_REVERSO'
                AND d.estado_verificacion = 'APROBADO');
