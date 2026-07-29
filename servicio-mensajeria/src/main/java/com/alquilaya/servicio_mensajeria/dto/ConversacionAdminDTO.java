package com.alquilaya.servicio_mensajeria.dto;

import com.alquilaya.servicio_mensajeria.enums.EstadoConversacion;
import com.alquilaya.servicio_mensajeria.enums.TipoConversacion;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Vista para admin: incluye ambas partes enriquecidas y metadata completa.
 * En conversaciones ROOMMATE, arrendadorId/arrendadorNombre/propiedadId/propiedadTitulo
 * quedan null y el segundo estudiante va en estudiante2Id/estudiante2Nombre.
 * {@code participantes} es la forma preferida de leer "quiénes son" desde el frontend
 * (agnóstica del tipo); los campos planos se mantienen para consultas puntuales.
 */
@Value
@Builder
public class ConversacionAdminDTO {
    Long id;
    TipoConversacion tipo;
    List<ParticipanteConversacionDTO> participantes;
    Long estudianteId;
    String estudianteNombre;
    Long arrendadorId;
    String arrendadorNombre;
    Long estudiante2Id;
    String estudiante2Nombre;
    Long propiedadId;
    String propiedadTitulo;
    EstadoConversacion estado;
    LocalDateTime fechaCreacion;
    LocalDateTime fechaUltimaActividad;
    String ultimoMensajePreview;
}
