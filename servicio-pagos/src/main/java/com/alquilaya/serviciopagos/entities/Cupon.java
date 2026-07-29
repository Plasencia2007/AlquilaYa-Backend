package com.alquilaya.serviciopagos.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Cupón de descuento (ítem 292). Por diseño, un cupón SOLO descuenta la comisión de
 * plataforma — nunca el {@code montoArrendador} — ver {@code CuponService#calcularDescuento}
 * para el razonamiento completo.
 */
@Entity
@Table(
        name = "cupones",
        uniqueConstraints = @UniqueConstraint(name = "uk_cupon_codigo", columnNames = "codigo")
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cupon {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String codigo;

    /** PORCENTAJE, MONTO_FIJO, COMISION_GRATIS. */
    @Column(name = "tipo_descuento", nullable = false, length = 20)
    private String tipoDescuento;

    /** % (0-100) si PORCENTAJE, S/ si MONTO_FIJO, null si COMISION_GRATIS. */
    private BigDecimal valor;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDateTime fechaInicio;

    @Column(name = "fecha_fin", nullable = false)
    private LocalDateTime fechaFin;

    /** Null = usos ilimitados. */
    @Column(name = "usos_maximos")
    private Integer usosMaximos;

    @Column(name = "usos_actuales", nullable = false)
    @Builder.Default
    private Integer usosActuales = 0;

    /** Monto mínimo cobrado (renta + comisión original) para poder aplicar el cupón. Null = sin mínimo. */
    @Column(name = "monto_minimo")
    private BigDecimal montoMinimo;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        if (fechaCreacion == null) fechaCreacion = LocalDateTime.now();
        if (usosActuales == null) usosActuales = 0;
        if (activo == null) activo = true;
    }
}
