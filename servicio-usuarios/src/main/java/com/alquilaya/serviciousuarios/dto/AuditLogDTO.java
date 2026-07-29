package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.entities.AuditLog;

import java.time.LocalDateTime;

/**
 * Vista de una fila de la bitácora de auditoría (G8-A) para el panel admin (ítems 364/365).
 * Proyecta la entidad {@link AuditLog} tal cual (no hay PII sensible más allá del correo del
 * actor, que ya es visible para cualquier ADMIN en el resto del panel).
 */
public record AuditLogDTO(
        Long id,
        Long actorUsuarioId,
        String actorCorreo,
        String accion,
        String entidad,
        Long entidadId,
        String detalle,
        String ip,
        LocalDateTime fecha
) {
    public static AuditLogDTO from(AuditLog a) {
        return new AuditLogDTO(
                a.getId(),
                a.getActorUsuarioId(),
                a.getActorCorreo(),
                a.getAccion(),
                a.getEntidad(),
                a.getEntidadId(),
                a.getDetalle(),
                a.getIp(),
                a.getFecha());
    }
}
