package com.alquilaya.serviciopropiedades.entities;

import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import com.alquilaya.serviciopropiedades.validaciones.anotaciones.CercaDeUpeu;
import com.alquilaya.serviciopropiedades.validaciones.anotaciones.CoordenadaLatitud;
import com.alquilaya.serviciopropiedades.validaciones.anotaciones.CoordenadaLongitud;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "propiedades")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@CercaDeUpeu
public class Propiedad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El título es obligatorio")
    @Size(max = 150, message = "El título no puede superar 150 caracteres")
    @Column(nullable = false)
    private String titulo;

    @Size(max = 5000, message = "La descripción no puede superar 5000 caracteres")
    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @NotNull(message = "El precio es obligatorio")
    @DecimalMin(value = "0.01", message = "El precio debe ser mayor a 0")
    @Column(nullable = false)
    private BigDecimal precio;

    @NotBlank(message = "La dirección es obligatoria")
    @Size(max = 255)
    @Column(nullable = false)
    private String direccion;

    private String ubicacionGps;

    @Column(name = "imagen_url")
    private String imagenUrl;

    @OneToMany(mappedBy = "propiedad", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    private List<PropiedadImagen> imagenes = new ArrayList<>();

    @Builder.Default
    @Enumerated(EnumType.STRING)
    private EstadoPropiedad estado = EstadoPropiedad.PENDIENTE;

    @Column(nullable = false)
    private Long arrendadorId;

    private String tipoPropiedad;

    private String periodoAlquiler;

    @PositiveOrZero(message = "El área no puede ser negativa")
    private Double area;

    @PositiveOrZero(message = "El piso no puede ser negativo")
    private Integer nroPiso;

    @Builder.Default
    private Boolean estaDisponible = true;

    private LocalDate disponibleDesde;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "propiedad_servicios", joinColumns = @JoinColumn(name = "propiedad_id"))
    @Column(name = "servicio")
    @Builder.Default
    private List<String> serviciosIncluidos = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "propiedad_reglas", joinColumns = @JoinColumn(name = "propiedad_id"))
    @Column(name = "regla")
    @Builder.Default
    private List<String> reglas = new ArrayList<>();

    @CoordenadaLatitud
    private Double latitud;

    @CoordenadaLongitud
    private Double longitud;

    private Integer distanciaMetros;

    @Builder.Default
    private Boolean aprobadoPorAdmin = false;

    @Builder.Default
    private Double calificacion = 5.0;

    @Builder.Default
    private Integer numResenas = 0;

    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;

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
