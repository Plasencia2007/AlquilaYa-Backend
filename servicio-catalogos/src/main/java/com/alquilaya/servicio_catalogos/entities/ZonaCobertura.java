package com.alquilaya.servicio_catalogos.entities;

import com.alquilaya.servicio_catalogos.enums.TipoLimite;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Área de cobertura de una {@link Universidad}. Una universidad simple tiene una sola
 * zona {@code CIRCULO} (campus + radio); una compleja puede tener varias (círculos y/o
 * polígonos) que se desempatan por {@code ordenPrioridad} si se solapan.
 *
 * La relación con {@code Universidad} se mantiene por {@code universidadId} (FK lógica
 * dentro del mismo esquema), siguiendo el estilo del resto del proyecto.
 */
@Entity
@Table(name = "zonas_cobertura")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ZonaCobertura {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long universidadId;

    @NotBlank(message = "El nombre de la zona es obligatorio")
    @Size(min = 2, max = 150, message = "El nombre debe tener entre 2 y 150 caracteres")
    @Column(nullable = false, length = 150)
    private String nombre;

    @Size(max = 500, message = "La descripción no puede superar 500 caracteres")
    @Column(length = 500)
    private String descripcion;

    @Size(max = 30, message = "El color no puede superar 30 caracteres")
    @Column(length = 30)
    private String color;

    @Builder.Default
    @Column(nullable = false)
    private Boolean activo = true;

    /** Zonas con orden menor se evalúan primero ante ubicaciones que cruzan varias zonas. */
    @Builder.Default
    @Column(nullable = false)
    private Integer ordenPrioridad = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TipoLimite tipoLimite = TipoLimite.CIRCULO;

    // --- Geometría CIRCULO ---
    private Double latitud;
    private Double longitud;
    private Double radioKm;

    // --- Geometría POLIGONO: array JSON [{ "lat": .., "lng": .. }, ...] ---
    @Column(columnDefinition = "TEXT")
    private String poligonoJson;

    // --- Tarifas: comisión al arrendador por cuarto vendido en esta zona (se ingresa a mano).
    //     Ambas nullable: si están vacías, no se cobra comisión en la zona. ---
    /** Porcentaje sobre el precio del cuarto (ej. 8.5 = 8.5%). */
    private Double comisionPorcentaje;

    /** Monto fijo por venta en soles. */
    @Column(precision = 12, scale = 2)
    private java.math.BigDecimal comisionMonto;

    @Column(updatable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
        if (activo == null) {
            activo = true;
        }
        if (ordenPrioridad == null) {
            ordenPrioridad = 0;
        }
        if (tipoLimite == null) {
            tipoLimite = TipoLimite.CIRCULO;
        }
    }
}
