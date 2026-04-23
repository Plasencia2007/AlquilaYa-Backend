package com.alquilaya.serviciopagos.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pagos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pago {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long reservaId;

    private String preferenciaId; // ID de Mercado Pago
    private String paymentId;    // ID del pago final
    private BigDecimal monto;
    private String estado;      // PENDING, SUCCESS, FAILURE
    
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaPago;

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
        if (estado == null) estado = "PENDIENTE";
    }
}
