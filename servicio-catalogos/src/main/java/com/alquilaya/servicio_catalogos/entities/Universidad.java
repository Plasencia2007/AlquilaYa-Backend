package com.alquilaya.servicio_catalogos.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Universidad / centro de estudios que ancla la cobertura de AlquilaYa.
 * Reemplaza la antigua constante "UPeU" quemada en el código por un dato configurable.
 * La geometría de cobertura vive en sus {@link ZonaCobertura} (1..N).
 */
@Entity
@Table(name = "universidades", uniqueConstraints = {
        @UniqueConstraint(name = "uk_universidades_nombre", columnNames = "nombre")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Universidad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre es obligatorio")
    @Size(min = 2, max = 150, message = "El nombre debe tener entre 2 y 150 caracteres")
    @Column(nullable = false, length = 150)
    private String nombre;

    @Size(max = 500, message = "La descripción no puede superar 500 caracteres")
    @Column(length = 500)
    private String descripcion;

    @Size(max = 30, message = "El color no puede superar 30 caracteres")
    @Column(length = 30)
    private String color;

    /** Punto de referencia del campus; centra el mapa en el admin. */
    private Double latitud;

    private Double longitud;

    @Builder.Default
    @Column(nullable = false)
    private Boolean activo = true;

    /** Campus ancla del sistema (distancias/cercanía). Solo una universidad debería tenerlo en true. */
    @Builder.Default
    @Column(nullable = false)
    private Boolean esPrincipal = false;

    @Column(updatable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
        if (activo == null) {
            activo = true;
        }
        if (esPrincipal == null) {
            esPrincipal = false;
        }
    }
}
