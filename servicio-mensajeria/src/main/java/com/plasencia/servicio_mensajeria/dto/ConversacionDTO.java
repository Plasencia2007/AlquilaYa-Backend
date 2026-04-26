package com.plasencia.servicio_mensajeria.dto;

import com.plasencia.servicio_mensajeria.entities.Conversacion;
import com.plasencia.servicio_mensajeria.enums.EstadoConversacion;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class ConversacionDTO {
    Long id;
    Long estudianteId;
    Long arrendadorId;
    Long propiedadId;
    EstadoConversacion estado;
    LocalDateTime fechaCreacion;
    LocalDateTime fechaUltimaActividad;
    String ultimoMensajePreview;

    public static ConversacionDTO from(Conversacion c) {
        return ConversacionDTO.builder()
                .id(c.getId())
                .estudianteId(c.getEstudianteId())
                .arrendadorId(c.getArrendadorId())
                .propiedadId(c.getPropiedadId())
                .estado(c.getEstado())
                .fechaCreacion(c.getFechaCreacion())
                .fechaUltimaActividad(c.getFechaUltimaActividad())
                .ultimoMensajePreview(c.getUltimoMensajePreview())
                .build();
    }
}
