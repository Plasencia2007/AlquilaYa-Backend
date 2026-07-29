package com.alquilaya.serviciopropiedades.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Testimonio público para la home (#85). Vista <b>privacy-safe</b> de una
 * {@link com.alquilaya.serviciopropiedades.entities.ResenaPropiedad}: solo expone un
 * nombre parcial ("María G."), la carrera (si servicio-usuarios la resuelve) y el
 * texto/estrella de la reseña. Nunca nombre completo, correo ni teléfono.
 */
@Data
@Builder
public class TestimonioDTO {
    private Long id;
    /** Nombre parcial del autor (p.ej. "María G."). Fallback "Estudiante" si no se resuelve. */
    private String autor;
    /** Carrera del estudiante si usuarios la expone; null para visitantes anónimos (sin JWT). */
    private String carrera;
    private Integer rating;
    private String comentario;
    private LocalDateTime fechaCreacion;
}
