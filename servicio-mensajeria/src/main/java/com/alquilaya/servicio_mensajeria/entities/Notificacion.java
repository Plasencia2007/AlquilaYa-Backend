package com.alquilaya.servicio_mensajeria.entities;

import com.alquilaya.servicio_mensajeria.enums.TipoNotificacion;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Notificación in-app dirigida a un usuario. Se crea en respuesta a eventos de
 * dominio (Kafka: reserva-events, pagos-topic, user-approval-events) o a
 * acciones internas del propio servicio-mensajeria (mensaje nuevo).
 *
 * El campo `datos` (JSONB) lleva el contexto específico del tipo
 * (ej. { reservaId: 12, propiedadTitulo: "Cuarto en Surco" }).
 */
@Entity
@Table(
        name = "notificaciones",
        indexes = {
                @Index(name = "idx_notif_usuario_fecha", columnList = "usuario_id, fecha_creacion DESC"),
                @Index(name = "idx_notif_usuario_no_leidas", columnList = "usuario_id, leida")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TipoNotificacion tipo;

    @NotBlank
    @Size(max = 120)
    @Column(nullable = false, length = 120)
    private String titulo;

    @NotBlank
    @Size(max = 500)
    @Column(nullable = false, length = 500)
    private String mensaje;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> datos = new HashMap<>();

    @Size(max = 255)
    @Column(name = "url_destino", length = 255)
    private String urlDestino;

    @Column(nullable = false)
    @Builder.Default
    private boolean leida = false;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_lectura")
    private LocalDateTime fechaLectura;

    @PrePersist
    protected void onCreate() {
        if (fechaCreacion == null) fechaCreacion = LocalDateTime.now();
    }
}
