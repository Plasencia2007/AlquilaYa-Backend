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
    // Sub-categorías (solo aplican a reseñas de PROPIEDAD; null en arrendador/legacy).
    private Integer ratingLimpieza;
    private Integer ratingUbicacion;
    private Integer ratingPrecio;
    private Integer ratingTrato;
    private String comentario;
    /** Respuesta pública del arrendador (solo reseñas de PROPIEDAD). */
    private String respuestaArrendador;
    private LocalDateTime fechaRespuesta;
    private Boolean visible;
    private LocalDateTime fechaCreacion;
}
