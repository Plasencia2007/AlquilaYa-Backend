package com.alquilaya.serviciopagos.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "pagos",
        indexes = {
                @Index(name = "idx_pago_reserva", columnList = "reserva_id"),
                @Index(name = "idx_pago_preferencia", columnList = "preferencia_id"),
                @Index(name = "idx_pago_payment", columnList = "payment_id")
        },
        uniqueConstraints = {
                // payment_id es NULLABLE; Postgres permite múltiples NULL en UNIQUE,
                // así que esto NO rompe pagos PENDIENTES sin paymentId.
                @UniqueConstraint(name = "uk_pago_payment_id", columnNames = "payment_id")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pago {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reserva_id", nullable = false)
    private Long reservaId;

    @Column(name = "preferencia_id")
    private String preferenciaId; // ID de Mercado Pago

    @Column(name = "payment_id")
    private String paymentId;    // ID del pago final (unique cuando no es null)

    /** Total cobrado al estudiante = montoArrendador + comision (lo que valida el webhook contra MP). */
    private BigDecimal monto;

    /** Comisión de plataforma retenida (ingreso de AlquilaYa). 0 si la zona no cobra comisión. */
    @Column(name = "comision")
    private BigDecimal comision;

    /** Lo que recibe el arrendador (precio del cuarto, sin la comisión). */
    @Column(name = "monto_arrendador")
    private BigDecimal montoArrendador;

    /** Estudiante dueño de la reserva. Para verificar acceso al estado del pago (anti-IDOR). */
    @Column(name = "estudiante_id")
    private Long estudianteId;

    private String estado;      // PENDIENTE, PAGADO, RECHAZADO, PENDIENTE_REVISION, DISCREPANCIA, EXPIRADO

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_pago")
    private LocalDateTime fechaPago;

    @Version
    @Column(nullable = false)
    private Long version;

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
        if (estado == null) estado = "PENDIENTE";
    }
}
