package com.alquilaya.serviciopagos.entities;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * G1: payout al arrendador. Agrega el {@code montoArrendador} de los pagos PAGADOs de un
 * arrendador que aún no se le habían pagado, en un desembolso a procesar.
 *
 * <p>V1 (esta clase) es un LIBRO CONTABLE + flujo admin-mediado: el admin genera el desembolso
 * pendiente, hace la transferencia por fuera (banco/Yape/lo que use hoy la operación) y lo marca
 * PROCESADO con la referencia. NO llama a ninguna API de MercadoPago para mover dinero real —
 * eso (Marketplace split-payment u Payouts API) requiere que el arrendador conecte su propia
 * cuenta MP vía OAuth (onboarding que no existe hoy) y mover dinero real no debe automatizarse
 * sin que alguien lo autorice y pruebe explícitamente. Queda documentado como el siguiente paso.
 */
@Entity
@Table(name = "desembolsos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Desembolso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "arrendador_id", nullable = false)
    private Long arrendadorId;

    @Column(name = "monto_total", nullable = false)
    private BigDecimal montoTotal;

    /** PENDIENTE, PROCESADO, FALLIDO. */
    @Builder.Default
    private String estado = "PENDIENTE";

    @Column(name = "metodo_pago")
    private String metodoPago;

    private String referencia;

    @Column(name = "motivo_fallo")
    private String motivoFallo;

    @Column(name = "procesado_por")
    private Long procesadoPor;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_procesado")
    private LocalDateTime fechaProcesado;

    @PrePersist
    protected void onCreate() {
        if (fechaCreacion == null) fechaCreacion = LocalDateTime.now();
    }
}
