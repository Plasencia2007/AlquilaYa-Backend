package com.alquilaya.serviciopropiedades.entities;

import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "reservas", indexes = {
        @Index(name = "idx_reserva_estudiante", columnList = "estudianteId"),
        @Index(name = "idx_reserva_arrendador", columnList = "arrendadorId"),
        @Index(name = "idx_reserva_propiedad", columnList = "propiedadId")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reserva {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long propiedadId;

    @Column(nullable = false)
    private Long estudianteId;

    @Column(nullable = false)
    private Long arrendadorId;

    @Column(nullable = false)
    private LocalDate fechaInicio;

    @Column(nullable = false)
    private LocalDate fechaFin;

    @Column(nullable = false)
    private BigDecimal montoTotal;

    /**
     * Habitación reservada, cuando la propiedad se gestiona por habitaciones. Null si el
     * inmueble se alquila completo. El solapamiento y el monto se calculan por habitación.
     */
    private Long habitacionId;

    /**
     * Comisión de plataforma efectivamente cobrada en esta venta, snapshotteada al confirmarse
     * el pago (la trae el evento PAGO_EXITOSO). Antes de pagar es null; las finanzas usan este
     * valor histórico para no verse afectadas si luego cambia la comisión de la zona.
     */
    private BigDecimal comision;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EstadoReserva estado = EstadoReserva.SOLICITADA;

    @Column(columnDefinition = "TEXT")
    private String motivoRechazo;

    /**
     * True una vez enviado el recordatorio de pago (reserva APROBADA cercana a
     * expirar). Evita recordatorios duplicados. Nullable para que ddl-auto pueda
     * agregar la columna sobre filas existentes.
     */
    @Builder.Default
    private Boolean recordatorioPagoEnviado = false;

    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;

    @Version
    @Column(nullable = false)
    private Long version;

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
        fechaActualizacion = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        fechaActualizacion = LocalDateTime.now();
    }
}
