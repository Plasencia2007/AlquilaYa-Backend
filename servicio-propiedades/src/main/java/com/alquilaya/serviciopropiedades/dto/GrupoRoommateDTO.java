package com.alquilaya.serviciopropiedades.dto;

import com.alquilaya.serviciopropiedades.entities.GrupoRoommate;
import com.alquilaya.serviciopropiedades.entities.MiembroGrupo;
import com.alquilaya.serviciopropiedades.enums.EstadoMiembro;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/** Grupo de roommates con sus miembros (#38 Fase 1b). */
@Data
@Builder
public class GrupoRoommateDTO {
    private Long id;
    private Long propiedadId;
    private String propiedadTitulo;
    private Long creadorEstudianteId;
    private String nombre;
    private String descripcion;
    private Integer cuposTotales;
    private int cuposOcupados;
    private String estado;
    private String codigoInvitacion;
    /** Link del grupo de WhatsApp para coordinar (#221), solo lo edita el creador. */
    private String linkWhatsapp;
    /** Reserva grupal generada (Fase 2), si el grupo ya reservó. */
    private Long reservaId;
    private List<MiembroGrupoDTO> miembros;

    public record MiembroGrupoDTO(Long estudianteId, String estado) {
        static MiembroGrupoDTO from(MiembroGrupo m) {
            return new MiembroGrupoDTO(m.getEstudianteId(),
                    m.getEstado() != null ? m.getEstado().name() : null);
        }
    }

    public static GrupoRoommateDTO from(GrupoRoommate g, String propiedadTitulo) {
        int ocupados = (int) g.getMiembros().stream()
                .filter(m -> m.getEstado() == EstadoMiembro.CREADOR || m.getEstado() == EstadoMiembro.UNIDO)
                .count();
        return GrupoRoommateDTO.builder()
                .id(g.getId())
                .propiedadId(g.getPropiedadId())
                .propiedadTitulo(propiedadTitulo)
                .creadorEstudianteId(g.getCreadorEstudianteId())
                .nombre(g.getNombre())
                .descripcion(g.getDescripcion())
                .cuposTotales(g.getCuposTotales())
                .cuposOcupados(ocupados)
                .estado(g.getEstado() != null ? g.getEstado().name() : null)
                .codigoInvitacion(g.getCodigoInvitacion())
                .linkWhatsapp(g.getLinkWhatsapp())
                .miembros(g.getMiembros().stream().map(MiembroGrupoDTO::from).toList())
                .build();
    }
}
