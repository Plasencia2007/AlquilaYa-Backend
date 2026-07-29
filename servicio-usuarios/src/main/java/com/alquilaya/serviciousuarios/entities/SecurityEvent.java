package com.alquilaya.serviciousuarios.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Ítem 351: sink de lectura de las alertas de seguridad publicadas a Kafka (topic
 * {@code user-security-events}, productor: {@code UserEventProducer#emitirAlertaIntentosFallidos}).
 *
 * <p>Persistida por {@code SecurityEventListener} (consumer del mismo servicio-usuarios que
 * publica el evento — el topic existía desde antes pero nadie lo consumía). El panel admin de
 * alertas ({@code GET /api/v1/usuarios/admin/security-events}) lee esta tabla en vez de Kafka
 * directamente.</p>
 *
 * <p>{@code detalle} guarda el payload del evento serializado a JSON (TEXT), sin esquema rígido
 * a propósito — mismo patrón que {@link EventoAnalytics#getPropiedades()}.</p>
 */
@Entity
@Table(
        name = "security_events",
        indexes = @Index(name = "idx_security_events_fecha", columnList = "fecha")
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SecurityEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** {@code eventType} del envelope canónico (ej. "USER_INTENTOS_FALLIDOS"). */
    @Column(nullable = false, length = 150)
    private String tipo;

    @Column(name = "usuario_id")
    private Long usuarioId;

    /** Payload del evento serializado a JSON. Forma libre, no tipada. */
    @Column(columnDefinition = "TEXT")
    private String detalle;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @PrePersist
    void onCreate() {
        if (fecha == null) fecha = LocalDateTime.now();
    }
}
