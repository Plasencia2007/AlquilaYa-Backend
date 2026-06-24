package com.alquilaya.serviciopropiedades.entities;

import com.alquilaya.serviciopropiedades.enums.EstadoMiembro;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Miembro de un grupo de roommates (#38 Fase 1b). */
@Entity
@Table(name = "miembros_grupo",
        uniqueConstraints = @UniqueConstraint(name = "uk_miembro_grupo_est", columnNames = {"grupo_id", "estudiante_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MiembroGrupo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grupo_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    private GrupoRoommate grupo;

    @Column(name = "estudiante_id", nullable = false)
    private Long estudianteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoMiembro estado;

    @Column(name = "fecha_union")
    private LocalDateTime fechaUnion;

    @PrePersist
    void onCreate() {
        if (fechaUnion == null) fechaUnion = LocalDateTime.now();
    }
}
