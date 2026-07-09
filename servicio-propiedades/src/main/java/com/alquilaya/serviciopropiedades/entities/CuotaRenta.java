package com.alquilaya.serviciopropiedades.entities;

import com.alquilaya.serviciopropiedades.enums.EstadoCuota;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Cuota mensual de renta recurrente asociada a una {@link Reserva} activa (G2).
 *
 * <p>Esta entidad es el <b>cronograma</b> de la renta mensual: una fila por mes del
 * arrendamiento. Es aditiva y NO altera el flujo de pago único existente
 * ({@code montoTotal} de la reserva). El <b>cobro real</b> de cada cuota es
 * responsabilidad de servicio-pagos (follow-up); aquí solo se mantiene el
 * calendario y se emiten recordatorios vía Outbox → {@code reserva-events}.
 *
 * <p>Idempotencia: la clave natural es {@code (reservaId, numeroCuota)} (índice
 * único {@code uk_cuota_renta_reserva_num}); {@code generarCuotas} no duplica.
 */
@Entity
@Table(name = "cuotas_renta", indexes = {
        @Index(name = "idx_cuota_renta_reserva", columnList = "reserva_id"),
        @Index(name = "idx_cuota_renta_estado_venc", columnList = "estado, fecha_vencimiento"),
        @Index(name = "uk_cuota_renta_reserva_num", columnList = "reserva_id, numero_cuota", unique = true)
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CuotaRenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reserva_id", nullable = false)
    private Long reservaId;

    /** 1-based: la cuota N cubre el N-ésimo mes del arrendamiento. */
    @Column(name = "numero_cuota", nullable = false)
    private Integer numeroCuota;

    /** Periodo facturado en formato {@code YYYY-MM} (mes calendario de la cuota). */
    @Column(nullable = false, length = 7)
    private String periodo;

    @Column(nullable = false, precision = 38, scale = 2)
    private BigDecimal monto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EstadoCuota estado = EstadoCuota.PENDIENTE;

    @Column(name = "fecha_vencimiento", nullable = false)
    private LocalDate fechaVencimiento;

    /** Fecha en que se registró el pago de la cuota. Null mientras no se pague. */
    @Column(name = "fecha_pago")
    private LocalDate fechaPago;

    /** True una vez emitido el recordatorio de "cuota por vencer" (evita duplicados). */
    @Column(name = "recordatorio_enviado", nullable = false)
    @Builder.Default
    private Boolean recordatorioEnviado = false;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        if (fechaCreacion == null) fechaCreacion = LocalDateTime.now();
        if (estado == null) estado = EstadoCuota.PENDIENTE;
        if (recordatorioEnviado == null) recordatorioEnviado = false;
    }
}
