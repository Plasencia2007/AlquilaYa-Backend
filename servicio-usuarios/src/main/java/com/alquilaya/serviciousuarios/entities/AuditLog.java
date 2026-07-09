package com.alquilaya.serviciousuarios.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Registro de auditoría append-only (G8-A) de acciones sensibles del ADMIN
 * (cambios de estado de cuenta, edición de usuarios, aprobación/rechazo de KYC,
 * eliminación de cuentas). Nunca se actualiza ni se borra: cada acción crea una
 * fila nueva vía {@link com.alquilaya.serviciousuarios.services.AuditLogService}.
 */
@Entity
@Table(
        name = "audit_log",
        indexes = {
                @Index(name = "idx_audit_log_fecha", columnList = "fecha"),
                @Index(name = "idx_audit_log_actor", columnList = "actor_usuario_id")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Id del usuario que ejecutó la acción (null si no se pudo resolver). */
    @Column(name = "actor_usuario_id")
    private Long actorUsuarioId;

    /** Correo del actor al momento de la acción (null si anónimo/no resuelto). */
    @Column(name = "actor_correo", length = 255)
    private String actorCorreo;

    /** Acción ejecutada, p. ej. CAMBIAR_ESTADO_USUARIO, VERIFICAR_DOCUMENTO. */
    @Column(nullable = false, length = 100)
    private String accion;

    /** Tipo de entidad afectada, p. ej. Usuario, DocumentoVerificacion. */
    @Column(nullable = false, length = 100)
    private String entidad;

    /** Id de la entidad afectada (null si no aplica). */
    @Column(name = "entidad_id")
    private Long entidadId;

    /** Detalle libre de la acción (transición de estado, motivo, etc.). */
    @Column(columnDefinition = "text")
    private String detalle;

    /** IP del actor (respeta X-Forwarded-For). Null si no disponible. */
    @Column(length = 45)
    private String ip;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime fecha;
}
