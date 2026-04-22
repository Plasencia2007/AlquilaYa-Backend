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
@Table(name = "resenas_arrendador", indexes = {
        @Index(name = "idx_resena_arr_arrendador", columnList = "arrendadorId"),
        @Index(name = "idx_resena_arr_estudiante", columnList = "estudianteId")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResenaArrendador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long arrendadorId;

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
