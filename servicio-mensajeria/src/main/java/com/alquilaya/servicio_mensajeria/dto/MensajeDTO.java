package com.alquilaya.servicio_mensajeria.dto;

import com.alquilaya.servicio_mensajeria.entities.Mensaje;
import com.alquilaya.servicio_mensajeria.enums.EstadoMensaje;
import com.alquilaya.servicio_mensajeria.enums.RolEmisor;
import com.alquilaya.servicio_mensajeria.enums.TipoMensaje;
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
    // Ítem 254: tipo de contenido + URL del adjunto (solo IMAGEN).
    TipoMensaje tipo;
    String urlAdjunto;

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
                .tipo(m.getTipo())
                .urlAdjunto(m.getUrlAdjunto())
                .build();
    }
}
