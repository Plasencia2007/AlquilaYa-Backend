package com.alquilaya.serviciopropiedades.entities;

import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import com.alquilaya.serviciopropiedades.validaciones.anotaciones.CercaDeUpeu;
import com.alquilaya.serviciopropiedades.validaciones.anotaciones.CoordenadaLatitud;
import com.alquilaya.serviciopropiedades.validaciones.anotaciones.CoordenadaLongitud;
import jakarta.persistence.*;
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

    @Column(nullable = false)
    private String titulo;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(nullable = false)
    private BigDecimal precio;

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

    private Double area;

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
