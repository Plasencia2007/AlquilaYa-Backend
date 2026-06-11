package com.alquilaya.serviciopropiedades.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Configuración editable de las reglas de reserva. Fila única (singleton, id=1)
 * que el panel admin puede modificar en caliente. El scheduler de expiración la
 * lee en cada ejecución, por lo que un cambio aplica sin reiniciar el servicio.
 */
@Entity
@Table(name = "configuracion_reserva")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfiguracionReserva {

    /** Singleton: siempre id = 1. */
    @Id
    private Long id;

    /** Horas que una reserva APROBADA espera el pago antes de pasar a EXPIRADA. */
    @Column(nullable = false)
    private Integer expiracionHoras;

    private LocalDateTime fechaActualizacion;

    @PrePersist
    @PreUpdate
    void touch() {
        fechaActualizacion = LocalDateTime.now();
    }
}
