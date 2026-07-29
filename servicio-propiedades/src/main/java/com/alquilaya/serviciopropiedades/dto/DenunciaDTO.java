package com.alquilaya.serviciopropiedades.dto;

import com.alquilaya.serviciopropiedades.entities.Denuncia;

import java.time.LocalDateTime;

/**
 * Vista de una denuncia para el panel admin.
 *
 * @param propiedadTotalDenuncias total de denuncias (cualquier estado) que tiene la MISMA
 *                                propiedad — insumo para la "severidad real" del ítem 376
 *                                (se calcula en el frontend: ALTA si ≥2, ver reports/listings).
 */
public record DenunciaDTO(
        Long id,
        Long propiedadId,
        String propiedadTitulo,
        String motivo,
        String descripcion,
        String estado,
        LocalDateTime fechaCreacion,
        Long propiedadTotalDenuncias
) {
    public static DenunciaDTO de(Denuncia d, String propiedadTitulo, Long propiedadTotalDenuncias) {
        return new DenunciaDTO(
                d.getId(),
                d.getPropiedadId(),
                propiedadTitulo,
                d.getMotivo() != null ? d.getMotivo().name() : null,
                d.getDescripcion(),
                d.getEstado() != null ? d.getEstado().name() : null,
                d.getFechaCreacion(),
                propiedadTotalDenuncias
        );
    }
}
