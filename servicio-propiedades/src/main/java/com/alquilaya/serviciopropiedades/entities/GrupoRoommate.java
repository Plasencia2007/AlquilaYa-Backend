package com.alquilaya.serviciopropiedades.entities;

import com.alquilaya.serviciopropiedades.enums.EstadoGrupo;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Grupo de roommates que se forma alrededor de una propiedad (#38 Fase 1b).
 * Cuando se completa, en Fase 2 generará una reserva grupal con pago dividido.
 */
@Entity
@Table(name = "grupos_roommate")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GrupoRoommate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "propiedad_id", nullable = false)
    private Long propiedadId;

    @Column(name = "creador_estudiante_id", nullable = false)
    private Long creadorEstudianteId;

    private String nombre;

    @Column(length = 500)
    private String descripcion;

    @Column(name = "cupos_totales", nullable = false)
    private Integer cuposTotales;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EstadoGrupo estado = EstadoGrupo.ABIERTO;

    /** Código para el link de invitación (unirse sin aprobación). */
    @Column(name = "codigo_invitacion", unique = true, nullable = false)
    private String codigoInvitacion;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @OneToMany(mappedBy = "grupo", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @Builder.Default
    private List<MiembroGrupo> miembros = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (fechaCreacion == null) fechaCreacion = LocalDateTime.now();
        if (codigoInvitacion == null) codigoInvitacion = UUID.randomUUID().toString().substring(0, 8);
        if (estado == null) estado = EstadoGrupo.ABIERTO;
    }
}
