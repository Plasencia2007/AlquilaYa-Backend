package com.alquilaya.serviciopropiedades.dto;

import com.alquilaya.serviciopropiedades.entities.DecisionModeracionPropiedad;

import java.time.LocalDateTime;

/** Vista de una fila del historial de decisiones de moderación de propiedades (ítem 366). */
public record DecisionModeracionPropiedadDTO(
        Long id,
        Long propiedadId,
        String propiedadTitulo,
        Long adminId,
        String decision,
        String motivo,
        LocalDateTime fecha
) {
    public static DecisionModeracionPropiedadDTO de(DecisionModeracionPropiedad d) {
        return new DecisionModeracionPropiedadDTO(
                d.getId(),
                d.getPropiedadId(),
                d.getPropiedadTitulo(),
                d.getAdminId(),
                d.getDecision() != null ? d.getDecision().name() : null,
                d.getMotivo(),
                d.getFecha()
        );
    }
}
