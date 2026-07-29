package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.entities.EnvioAlerta;
import com.alquilaya.serviciousuarios.enums.EstadoEnvioAlerta;

import java.time.LocalDateTime;

/**
 * Vista admin de una fila de la cola de alertas por correo que agotó sus reintentos
 * (estado {@link EstadoEnvioAlerta#FALLIDO}, DLQ lógico). Proyecta sólo lo útil para
 * diagnosticar el fallo; nunca se expone la entidad {@link EnvioAlerta} cruda.
 */
public record EnvioAlertaFallidaDTO(
        Long id,
        String correo,
        Long propiedadId,
        Long suscripcionId,
        String titulo,
        EstadoEnvioAlerta estado,
        Integer intentos,
        String ultimoError,
        LocalDateTime proximoIntento,
        LocalDateTime createdAt,
        LocalDateTime enviadoAt
) {

    public static EnvioAlertaFallidaDTO from(EnvioAlerta e) {
        return new EnvioAlertaFallidaDTO(
                e.getId(),
                e.getCorreo(),
                e.getPropiedadId(),
                e.getSuscripcionId(),
                e.getTitulo(),
                e.getEstado(),
                e.getIntentos(),
                e.getUltimoError(),
                e.getProximoIntento(),
                e.getCreatedAt(),
                e.getEnviadoAt());
    }
}
