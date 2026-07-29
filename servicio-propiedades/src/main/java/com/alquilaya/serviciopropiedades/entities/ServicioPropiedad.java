package com.alquilaya.serviciopropiedades.entities;

import com.alquilaya.serviciopropiedades.enums.EstadoServicio;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Servicio de una propiedad con su estado (incluido / aparte / no disponible). Embebido como
 * @ElementCollection en {@link Propiedad}.
 */
@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServicioPropiedad {

    /** Clave del catálogo SERVICIO (ej. WIFI, AGUA, LUZ). */
    @Column(name = "servicio")
    private String servicio;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", length = 20)
    private EstadoServicio estado;

    /**
     * Monto mensual (S/) de este servicio cuando {@code estado} es APARTE (se paga
     * por fuera de la renta). Nullable: no aplica a INCLUIDO/NO_DISPONIBLE ni a
     * filas legacy sin monto cargado.
     */
    @Column(name = "monto")
    private BigDecimal monto;
}
