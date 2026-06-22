package com.alquilaya.serviciopropiedades.dto;

import com.alquilaya.serviciopropiedades.entities.Denuncia;

import java.time.LocalDateTime;

/** Vista de una denuncia para el panel admin. */
public record DenunciaDTO(
        Long id,
        Long propiedadId,
        String propiedadTitulo,
        String motivo,
        String descripcion,
        String estado,
        LocalDateTime fechaCreacion
) {
    public static DenunciaDTO de(Denuncia d, String propiedadTitulo) {
        return new DenunciaDTO(
                d.getId(),
                d.getPropiedadId(),
                propiedadTitulo,
                d.getMotivo() != null ? d.getMotivo().name() : null,
                d.getDescripcion(),
                d.getEstado() != null ? d.getEstado().name() : null,
                d.getFechaCreacion()
        );
    }
}
