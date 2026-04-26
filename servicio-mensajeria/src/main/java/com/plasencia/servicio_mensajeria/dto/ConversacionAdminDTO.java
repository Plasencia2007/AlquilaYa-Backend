package com.plasencia.servicio_mensajeria.dto;

import com.plasencia.servicio_mensajeria.enums.EstadoConversacion;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

/**
 * Vista para admin: incluye ambas partes enriquecidas y metadata completa.
 */
@Value
@Builder
public class ConversacionAdminDTO {
    Long id;
    Long estudianteId;
    String estudianteNombre;
    Long arrendadorId;
    String arrendadorNombre;
    Long propiedadId;
    String propiedadTitulo;
    EstadoConversacion estado;
    LocalDateTime fechaCreacion;
    LocalDateTime fechaUltimaActividad;
    String ultimoMensajePreview;
}
