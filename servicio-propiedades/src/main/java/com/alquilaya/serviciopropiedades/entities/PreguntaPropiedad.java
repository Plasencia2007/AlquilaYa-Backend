package com.alquilaya.serviciopropiedades.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Pregunta pública de un estudiante sobre una propiedad (ítem 166), respondida
 * públicamente por el arrendador dueño. FK lógica a Propiedad (id), mismo
 * patrón que {@link ResenaPropiedad}: sin relación JPA, se valida contra
 * PropiedadRepository en el service.
 */
@Entity
@Table(name = "preguntas_propiedad", indexes = {
        @Index(name = "idx_pregunta_prop_propiedad", columnList = "propiedadId")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PreguntaPropiedad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long propiedadId;

    @Column(nullable = false)
    private Long estudianteId;

    /** Snapshot del nombre del estudiante al momento de preguntar (mismo patrón que reseñas). */
    @Column(nullable = false)
    private String estudianteNombre;

    @NotBlank(message = "La pregunta es obligatoria")
    @Size(max = 500, message = "La pregunta no puede exceder 500 caracteres")
    @Column(nullable = false, length = 500)
    private String pregunta;

    @Size(max = 500, message = "La respuesta no puede exceder 500 caracteres")
    @Column(length = 500)
    private String respuesta;

    private LocalDateTime fechaRespuesta;

    /** Moderación futura: solo se listan públicamente las visibles. */
    @Builder.Default
    private Boolean visible = true;

    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
        if (visible == null) {
            visible = true;
        }
    }
}
