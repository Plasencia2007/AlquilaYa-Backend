package com.alquilaya.servicio_mensajeria.dto;

import com.alquilaya.servicio_mensajeria.entities.ReporteConversacion;

import java.time.LocalDateTime;

/** Vista de un reporte de conversación para el panel de moderación admin. */
public record ReporteConversacionDTO(
        Long id,
        Long conversacionId,
        Long reportanteId,
        String reportanteRol,
        String motivo,
        String descripcion,
        String estado,
        LocalDateTime fechaCreacion
) {
    public static ReporteConversacionDTO de(ReporteConversacion r) {
        return new ReporteConversacionDTO(
                r.getId(),
                r.getConversacionId(),
                r.getReportanteId(),
                r.getReportanteRol(),
                r.getMotivo() != null ? r.getMotivo().name() : null,
                r.getDescripcion(),
                r.getEstado() != null ? r.getEstado().name() : null,
                r.getFechaCreacion()
        );
    }
}
