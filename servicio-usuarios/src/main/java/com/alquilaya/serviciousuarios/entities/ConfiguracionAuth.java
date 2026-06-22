package com.alquilaya.serviciousuarios.entities;

import com.alquilaya.serviciousuarios.enums.MetodoVerificacion;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Configuración editable de autenticación. Fila única (singleton, id=1) que el
 * panel admin modifica en caliente: define qué verificación se exige al iniciar
 * sesión. El gate de login y el registro la leen en cada uso, sin reiniciar.
 */
@Entity
@Table(name = "configuracion_auth")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfiguracionAuth {

    /** Singleton: siempre id = 1. */
    @Id
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MetodoVerificacion metodoVerificacion;

    private LocalDateTime fechaActualizacion;

    @PrePersist
    @PreUpdate
    void touch() {
        fechaActualizacion = LocalDateTime.now();
    }
}
