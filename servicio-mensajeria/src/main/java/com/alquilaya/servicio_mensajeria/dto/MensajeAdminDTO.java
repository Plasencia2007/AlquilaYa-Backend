package com.alquilaya.servicio_mensajeria.dto;

import com.alquilaya.servicio_mensajeria.enums.EstadoMensaje;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

/**
 * Vista de un mensaje para el panel admin de moderación: a diferencia de
 * {@link MensajeDTO} (usado también por el chat en vivo, donde resolver el nombre
 * por mensaje sería un Feign por mensaje), aquí el caller ya resolvió los nombres
 * de los participantes una sola vez por conversación.
 */
@Value
@Builder
public class MensajeAdminDTO {
    Long id;
    Long conversacionId;
    Long remitenteId;
    String remitenteNombre;
    String contenido;
    EstadoMensaje estado;
    LocalDateTime fechaEnvio;
    /** Motivo del último bloqueo registrado en el log de moderación; null si no está bloqueado. */
    String motivoBloqueo;
}
