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
@Table(name = "resenas_propiedad", indexes = {
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

    @Min(1) @Max(5)
    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String comentario;

    @Builder.Default
    private Boolean visible = true;

    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
    }
}
