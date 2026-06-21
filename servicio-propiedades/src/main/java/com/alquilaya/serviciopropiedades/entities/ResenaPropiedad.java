package com.alquilaya.serviciopropiedades.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "resenas_propiedad", uniqueConstraints = {
        @UniqueConstraint(name = "uk_resena_prop_estudiante_propiedad", columnNames = {"estudianteId", "propiedadId"})
}, indexes = {
        @Index(name = "idx_resena_prop_propiedad", columnList = "propiedadId"),
        @Index(name = "idx_resena_prop_estudiante", columnList = "estudianteId")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResenaPropiedad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long propiedadId;

    @Column(nullable = false)
    private Long estudianteId;

    /** Rating general (1-5). Se calcula como el promedio de las sub-categorías. */
    @Min(1) @Max(5)
    @Column(nullable = false)
    private Integer rating;

    // --- Sub-categorías (1-5). Nullable por compatibilidad con reseñas antiguas. ---
    @Min(1) @Max(5) private Integer ratingLimpieza;
    @Min(1) @Max(5) private Integer ratingUbicacion;
    @Min(1) @Max(5) private Integer ratingPrecio;
    @Min(1) @Max(5) private Integer ratingTrato;

    @Column(columnDefinition = "TEXT")
    private String comentario;

    /** Respuesta pública del arrendador a esta reseña (estilo Airbnb). Null = sin responder. */
    @Column(columnDefinition = "TEXT")
    private String respuestaArrendador;

    /** Momento de la respuesta del arrendador. */
    private LocalDateTime fechaRespuesta;

    @Builder.Default
    private Boolean visible = true;

    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
    }
}
