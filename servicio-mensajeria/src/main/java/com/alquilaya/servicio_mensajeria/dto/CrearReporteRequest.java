package com.alquilaya.servicio_mensajeria.dto;

import com.alquilaya.servicio_mensajeria.enums.MotivoReporte;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Cuerpo para reportar una conversación desde el chat (ítem 261). */
public record CrearReporteRequest(
        @NotNull MotivoReporte motivo,
        @Size(max = 500) String descripcion
) {}
