package com.plasencia.servicio_mensajeria.dto;

import com.plasencia.servicio_mensajeria.entities.Notificacion;
import com.plasencia.servicio_mensajeria.enums.TipoNotificacion;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.Map;

@Value
@Builder
public class NotificacionDTO {
    Long id;
    TipoNotificacion tipo;
    String titulo;
    String mensaje;
    Map<String, Object> datos;
    String urlDestino;
    boolean leida;
    LocalDateTime fechaCreacion;
    LocalDateTime fechaLectura;

    public static NotificacionDTO from(Notificacion n) {
        return NotificacionDTO.builder()
                .id(n.getId())
                .tipo(n.getTipo())
                .titulo(n.getTitulo())
                .mensaje(n.getMensaje())
                .datos(n.getDatos())
                .urlDestino(n.getUrlDestino())
                .leida(n.isLeida())
                .fechaCreacion(n.getFechaCreacion())
                .fechaLectura(n.getFechaLectura())
                .build();
    }
}
