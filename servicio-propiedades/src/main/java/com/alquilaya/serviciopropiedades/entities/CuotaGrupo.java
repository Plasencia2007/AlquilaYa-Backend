package com.alquilaya.serviciopropiedades.entities;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Cuota de un miembro en una reserva grupal (#38 Fase 2). Lo que ese estudiante debe pagar.
 * La reserva se confirma (PAGADA) solo cuando todas sus cuotas están PAGADO.
 */
@Entity
@Table(name = "cuotas_grupo",
        uniqueConstraints = @UniqueConstraint(name = "uk_cuota_reserva_est", columnNames = {"reserva_id", "estudiante_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CuotaGrupo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "grupo_id", nullable = false)
    private Long grupoId;

    @Column(name = "reserva_id", nullable = false)
    private Long reservaId;

    @Column(name = "estudiante_id", nullable = false)
    private Long estudianteId;

    @Column(nullable = false)
    private BigDecimal monto;

    /** PENDIENTE | PAGADO */
    @Column(nullable = false)
    @Builder.Default
    private String estado = "PENDIENTE";

    @Column(name = "payment_id")
    private String paymentId;

    @Column(name = "fecha_pago")
    private LocalDateTime fechaPago;
}
