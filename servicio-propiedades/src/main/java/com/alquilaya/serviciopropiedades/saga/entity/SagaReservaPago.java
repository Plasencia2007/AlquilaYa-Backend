package com.alquilaya.serviciopropiedades.saga.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Mapeo JPA de la tabla {@code saga_reserva_pago} (DDL en V8__saga_reserva_pago.sql).
 *
 * El campo {@link #version} habilita locking optimista — si dos hilos intentan
 * modificar la misma saga en paralelo (ej. el listener de PAGO_EXITOSO y la cancelación
 * por arrendador), uno fallará con {@code OptimisticLockException} y reintentará.
 */
@Entity
@Table(name = "saga_reserva_pago", indexes = {
        @Index(name = "idx_saga_reserva_app", columnList = "reserva_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SagaReservaPago {

    @Id
    @Column(name = "saga_id", nullable = false, updatable = false)
    private UUID sagaId;

    @Column(name = "reserva_id", nullable = false)
    private Long reservaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_saga", nullable = false, length = 50)
    private EstadoSaga estadoSaga;

    @Enumerated(EnumType.STRING)
    @Column(name = "paso_actual", nullable = false, length = 50)
    private PasoSaga pasoActual;

    @Column(name = "intentos", nullable = false)
    @Builder.Default
    private Integer intentos = 0;

    @Column(name = "payload", columnDefinition = "TEXT")
    private String payload;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "ultimo_error", columnDefinition = "TEXT")
    private String ultimoError;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (sagaId == null) sagaId = UUID.randomUUID();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (intentos == null) intentos = 0;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
