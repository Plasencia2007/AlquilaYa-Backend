package com.alquilaya.serviciopropiedades.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Precio por temporada/ciclo de una propiedad: en el rango [fechaInicio, fechaFin] el precio
 * es {@code precio}. Aplica solo a propiedades de unidad completa (no gestión por habitación).
 * La reserva usa el precio de la temporada que cubre su CHECK-IN; si ninguna aplica, el precio base.
 */
@Entity
@Table(name = "precio_temporadas", indexes = {
        @Index(name = "idx_precio_temp_propiedad", columnList = "propiedadId")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrecioTemporada {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long propiedadId;

    @NotNull
    @Column(nullable = false)
    private LocalDate fechaInicio;

    @NotNull
    @Column(nullable = false)
    private LocalDate fechaFin;

    @NotNull
    @DecimalMin(value = "0.01", message = "El precio debe ser mayor a 0")
    @Column(nullable = false)
    private BigDecimal precio;

    @Size(max = 60)
    private String etiqueta;
}
