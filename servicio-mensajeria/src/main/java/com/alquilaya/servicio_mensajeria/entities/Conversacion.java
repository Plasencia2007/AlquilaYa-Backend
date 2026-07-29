package com.alquilaya.servicio_mensajeria.entities;

import com.alquilaya.servicio_mensajeria.enums.EstadoConversacion;
import com.alquilaya.servicio_mensajeria.enums.TipoConversacion;
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
                        columnList = "arrendador_id, fecha_ultima_actividad DESC"),
                @Index(name = "idx_conv_estudiante2_actividad",
                        columnList = "estudiante2_id, fecha_ultima_actividad DESC")
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

    /**
     * Null en conversaciones {@code ROOMMATE} (no hay arrendador). Obligatorio en
     * {@code ESTUDIANTE_ARRENDADOR} — validado en el service, no aquí, porque la
     * obligatoriedad depende de {@link #tipo}.
     */
    @Column(name = "arrendador_id")
    private Long arrendadorId;

    /** Segundo estudiante de una conversación {@code ROOMMATE}; null en las demás. */
    @Column(name = "estudiante2_id")
    private Long estudiante2Id;

    /** Null en conversaciones {@code ROOMMATE}; obligatorio en {@code ESTUDIANTE_ARRENDADOR}. */
    @Column(name = "propiedad_id")
    private Long propiedadId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private TipoConversacion tipo = TipoConversacion.ESTUDIANTE_ARRENDADOR;

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
        if (tipo == null) tipo = TipoConversacion.ESTUDIANTE_ARRENDADOR;
    }

    /** El otro participante para efectos de broadcast: arrendadorId, o estudiante2Id en ROOMMATE. */
    public Long getSegundoParticipanteId() {
        return tipo == TipoConversacion.ROOMMATE ? estudiante2Id : arrendadorId;
    }

    @PreUpdate
    protected void onUpdate() {
        if (fechaUltimaActividad == null) {
            fechaUltimaActividad = LocalDateTime.now();
        }
    }
}
