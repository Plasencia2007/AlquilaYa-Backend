package com.alquilaya.serviciopropiedades.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ResenaResponseDTO {
    private Long id;
    /** PROPIEDAD o ARRENDADOR. */
    private String tipo;
    private Long targetId; // propiedadId o arrendadorId
    private Long estudianteId;
    private String estudianteNombre;
    private Integer rating;
    private String comentario;
    private Boolean visible;
    private LocalDateTime fechaCreacion;
}
