package com.plasencia.servicio_mensajeria.dto;

import com.plasencia.servicio_mensajeria.enums.EstadoConversacion;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

/**
 * Resumen optimizado para el listado de conversaciones del usuario.
 * Incluye datos de contraparte enriquecidos vía Feign y conteo de no-leídos.
 */
@Value
@Builder
public class ConversacionResumenDTO {
    Long id;
    Long contraparteId;
    String contraparteNombre;
    String contraparteRol; // "ESTUDIANTE" | "ARRENDADOR"
    Long propiedadId;
    String propiedadTitulo;
    EstadoConversacion estado;
    LocalDateTime fechaUltimaActividad;
    String ultimoMensajePreview;
    long noLeidos;
}
