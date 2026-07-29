package com.alquilaya.servicio_mensajeria.dto;

import com.alquilaya.servicio_mensajeria.entities.Conversacion;
import com.alquilaya.servicio_mensajeria.enums.EstadoConversacion;
import com.alquilaya.servicio_mensajeria.enums.TipoConversacion;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class ConversacionDTO {
    Long id;
    TipoConversacion tipo;
    Long estudianteId;
    Long arrendadorId;
    /** Segundo estudiante; solo presente en conversaciones ROOMMATE. */
    Long estudiante2Id;
    Long propiedadId;
    EstadoConversacion estado;
    LocalDateTime fechaCreacion;
    LocalDateTime fechaUltimaActividad;
    String ultimoMensajePreview;

    public static ConversacionDTO from(Conversacion c) {
        return ConversacionDTO.builder()
                .id(c.getId())
                .tipo(c.getTipo())
                .estudianteId(c.getEstudianteId())
                .arrendadorId(c.getArrendadorId())
                .estudiante2Id(c.getEstudiante2Id())
                .propiedadId(c.getPropiedadId())
                .estado(c.getEstado())
                .fechaCreacion(c.getFechaCreacion())
                .fechaUltimaActividad(c.getFechaUltimaActividad())
                .ultimoMensajePreview(c.getUltimoMensajePreview())
                .build();
    }
}
