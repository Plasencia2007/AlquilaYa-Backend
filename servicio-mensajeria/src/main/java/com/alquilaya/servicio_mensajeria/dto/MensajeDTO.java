package com.alquilaya.servicio_mensajeria.dto;

import com.alquilaya.servicio_mensajeria.entities.Mensaje;
import com.alquilaya.servicio_mensajeria.enums.EstadoMensaje;
import com.alquilaya.servicio_mensajeria.enums.RolEmisor;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class MensajeDTO {
    Long id;
    Long conversacionId;
    Long emisorPerfilId;
    RolEmisor emisorRol;
    String contenido;
    EstadoMensaje estado;
    LocalDateTime fechaEnvio;
    LocalDateTime fechaLectura;

    public static MensajeDTO from(Mensaje m) {
        return MensajeDTO.builder()
                .id(m.getId())
                .conversacionId(m.getConversacion() != null ? m.getConversacion().getId() : null)
                .emisorPerfilId(m.getEmisorPerfilId())
                .emisorRol(m.getEmisorRol())
                .contenido(m.getContenido())
                .estado(m.getEstado())
                .fechaEnvio(m.getFechaEnvio())
                .fechaLectura(m.getFechaLectura())
                .build();
    }
}
