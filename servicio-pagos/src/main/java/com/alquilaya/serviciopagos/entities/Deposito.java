package com.alquilaya.serviciopagos.entities;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * G3: garantía / depósito de una reserva. V1 admin-mediado (mismo espíritu que
 * {@link Desembolso}): el depósito se cobra hoy junto con la renta o por un canal externo —
 * NO hay un cargo separado automático en MercadoPago (requeriría tocar el webhook de pagos,
 * que ya maneja dinero real de forma probada; separar el cobro es un cambio de mayor riesgo
 * que no se hizo a ciegas). Un admin CAPTURA (confirma que se cobró, con o sin paymentId de
 * MP), y luego DEVUELVE (reembolso real vía MP si hay paymentId), RETIENE PARCIAL o marca
 * PERDIDO (el arrendador se lo queda por daños) — cada transición queda auditada.
 */
@Entity
@Table(name = "depositos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Deposito {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reserva_id", nullable = false)
    private Long reservaId;

    @Column(name = "arrendador_id")
    private Long arrendadorId;

    @Column(nullable = false)
    private BigDecimal monto;

    /** Cuánto se devolvió realmente (RETENIDO_PARCIAL/DEVUELTO). Null si aún no aplica. */
    @Column(name = "monto_devuelto")
    private BigDecimal montoDevuelto;

    /** PENDIENTE, RETENIDO, DEVUELTO, RETENIDO_PARCIAL, PERDIDO. */
    @Builder.Default
    private String estado = "PENDIENTE";

    /** ID del pago en MercadoPago si el depósito se cobró junto con la renta (permite reembolso real). */
    @Column(name = "payment_id")
    private String paymentId;

    @Column(name = "motivo_retencion")
    private String motivoRetencion;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    @PrePersist
    protected void onCreate() {
        LocalDateTime ahora = LocalDateTime.now();
        if (fechaCreacion == null) fechaCreacion = ahora;
        fechaActualizacion = ahora;
    }

    @PreUpdate
    protected void onUpdate() {
        fechaActualizacion = LocalDateTime.now();
    }
}
