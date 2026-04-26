package com.plasencia.servicio_mensajeria.entities;

import com.plasencia.servicio_mensajeria.enums.EstadoConversacion;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "conversaciones",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_conversacion_par_propiedad",
                columnNames = {"estudiante_id", "arrendador_id", "propiedad_id"}
        ),
        indexes = {
                @Index(name = "idx_conv_estudiante_actividad",
                        columnList = "estudiante_id, fecha_ultima_actividad DESC"),
                @Index(name = "idx_conv_arrendador_actividad",
                        columnList = "arrendador_id, fecha_ultima_actividad DESC")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "estudiante_id", nullable = false)
    private Long estudianteId;

    @NotNull
    @Column(name = "arrendador_id", nullable = false)
    private Long arrendadorId;

    @NotNull
    @Column(name = "propiedad_id", nullable = false)
    private Long propiedadId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EstadoConversacion estado = EstadoConversacion.ACTIVA;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_ultima_actividad", nullable = false)
    private LocalDateTime fechaUltimaActividad;

    @Column(name = "ultimo_mensaje_preview", length = 200)
    private String ultimoMensajePreview;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (fechaCreacion == null) fechaCreacion = now;
        if (fechaUltimaActividad == null) fechaUltimaActividad = now;
        if (estado == null) estado = EstadoConversacion.ACTIVA;
    }

    @PreUpdate
    protected void onUpdate() {
        if (fechaUltimaActividad == null) {
            fechaUltimaActividad = LocalDateTime.now();
        }
    }
}
