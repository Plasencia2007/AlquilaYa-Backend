package com.alquilaya.servicio_mensajeria.entities;

import com.alquilaya.servicio_mensajeria.enums.EstadoReporte;
import com.alquilaya.servicio_mensajeria.enums.MotivoReporte;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Reporte de una conversación hecho por un participante (acoso, fraude, spam...).
 * Deliberadamente separada de {@link ModeracionLog}: ese log modela acciones del
 * ADMIN sobre mensajes/conversaciones (admin_id/admin_email son NOT NULL), no
 * denuncias de usuarios finales.
 */
@Entity
@Table(name = "reportes_conversacion", indexes = {
        @Index(name = "idx_reporte_conversacion", columnList = "conversacion_id"),
        @Index(name = "idx_reporte_estado", columnList = "estado")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReporteConversacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "conversacion_id", nullable = false)
    private Long conversacionId;

    /** perfilId de quien reporta (siempre presente: el endpoint exige autenticación). */
    @NotNull
    @Column(name = "reportante_id", nullable = false)
    private Long reportanteId;

    /** "ESTUDIANTE" | "ARRENDADOR": el rol con el que el caller participa en la conversación. */
    @NotNull
    @Column(name = "reportante_rol", nullable = false, length = 20)
    private String reportanteRol;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MotivoReporte motivo;

    @Size(max = 500)
    @Column(length = 500)
    private String descripcion;

    @Builder.Default
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoReporte estado = EstadoReporte.PENDIENTE;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        if (fechaCreacion == null) fechaCreacion = LocalDateTime.now();
        if (estado == null) estado = EstadoReporte.PENDIENTE;
    }
}
