package com.alquilaya.serviciopropiedades.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/** Igual que {@link com.alquilaya.serviciopropiedades.entities.PreguntaPropiedad} menos {@code visible} (moderación interna). */
@Data
@Builder
public class PreguntaPropiedadResponseDTO {
    private Long id;
    private Long propiedadId;
    private Long estudianteId;
    private String estudianteNombre;
    private String pregunta;
    private String respuesta;
    private LocalDateTime fechaRespuesta;
    private LocalDateTime fechaCreacion;
}
