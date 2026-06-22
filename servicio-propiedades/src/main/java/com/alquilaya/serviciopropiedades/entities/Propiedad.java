package com.alquilaya.serviciopropiedades.entities;

import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
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

    /**
     * Último precio antes de la última bajada. Se setea al bajar el precio y se limpia
     * (null) al subirlo. Alimenta el badge REBAJA y el precio tachado en UI.
     */
    private BigDecimal precioAnterior;

    /**
     * Momento de la última bajada de precio. Permite que el badge REBAJA EXPIRE
     * (no es "rebaja" eterna): solo se considera vigente dentro de una ventana de días.
     * Se setea junto con {@link #precioAnterior} al bajar y se limpia al subir.
     */
    private LocalDateTime fechaCambioPrecio;

    @NotBlank(message = "La dirección es obligatoria")
    @Size(max = 255)
    @Column(nullable = false)
    private String direccion;

    private String ubicacionGps;

    @Column(name = "imagen_url")
    private String imagenUrl;

    /**
     * Enlace a un video de la propiedad (YouTube/Vimeo o archivo .mp4/.webm directo).
     * Se valida y normaliza en el controller. Null = sin video. Extensible: para un
     * tour 360° embebido se agregaría un campo paralelo sin tocar este.
     */
    @Column(name = "video_url", length = 512)
    private String videoUrl;

    @OneToMany(mappedBy = "propiedad", cascade = CascadeType.ALL, orphanRemoval = true)
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

    // --- Distribución de la propiedad. Obligatorios para tipos multi-ambiente
    //     (DEPARTAMENTO/MINI_DEPA/CASA); para un CUARTO/ESTUDIO individual son opcionales.
    //     Se validan según el tipo en PropiedadController. ---
    /** Número de dormitorios/cuartos del inmueble. */
    @PositiveOrZero(message = "El número de dormitorios no puede ser negativo")
    private Integer numDormitorios;

    /** Número de baños. */
    @PositiveOrZero(message = "El número de baños no puede ser negativo")
    private Integer numBanos;

    /** Cuántas personas pueden vivir (capacidad). Se alquila el inmueble completo. */
    @PositiveOrZero(message = "La capacidad de personas no puede ser negativa")
    private Integer capacidadPersonas;

    /** Tiene sala/estar. */
    private Boolean tieneSala;

    /** Tiene cocina. */
    private Boolean tieneCocina;

    /** Viene amoblado. */
    private Boolean amoblado;

    /**
     * Si true, el inmueble se alquila cuarto por cuarto: tiene {@link Habitacion} reservables
     * por separado (cada una con su precio/estado) y la reserva apunta a una habitación. Si
     * false (default), se alquila completo y el precio/disponibilidad son a nivel propiedad.
     */
    @Builder.Default
    private Boolean gestionPorHabitacion = false;

    @Builder.Default
    private Boolean estaDisponible = true;

    private LocalDate disponibleDesde;

    /**
     * Política de cancelación: decide si una cancelación PAGADA se reembolsa según la
     * anticipación al check-in. Default FLEXIBLE = reembolso completo (preserva el
     * comportamiento previo). Ver {@link com.alquilaya.serviciopropiedades.enums.PoliticaCancelacion}.
     */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private com.alquilaya.serviciopropiedades.enums.PoliticaCancelacion politicaCancelacion =
            com.alquilaya.serviciopropiedades.enums.PoliticaCancelacion.FLEXIBLE;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "propiedad_servicios", joinColumns = @JoinColumn(name = "propiedad_id"))
    @Column(name = "servicio")
    private List<String> serviciosIncluidos = new ArrayList<>();

    /**
     * Servicios con estado (INCLUIDO / APARTE / NO_DISPONIBLE). Es la fuente de verdad nueva;
     * {@code serviciosIncluidos} se deriva de aquí (los INCLUIDO) vía
     * {@link #sincronizarServiciosIncluidos()} para no romper la búsqueda ni el display previos.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "propiedad_servicios_estado", joinColumns = @JoinColumn(name = "propiedad_id"))
    @Builder.Default
    private List<ServicioPropiedad> servicios = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "propiedad_reglas", joinColumns = @JoinColumn(name = "propiedad_id"))
    @Column(name = "regla")
    private List<String> reglas = new ArrayList<>();

    @CoordenadaLatitud
    private Double latitud;

    @CoordenadaLongitud
    private Double longitud;

    private Integer distanciaMetros;

    /**
     * Zona de cobertura (del catálogo) en la que cae la propiedad, resuelta al publicar
     * según su ubicación. Nullable por filas legacy y por tolerancia si el catálogo no
     * respondió; las propiedades nuevas siempre se resuelven o se rechazan.
     */
    private Long zonaId;

    /** Universidad dueña de la zona resuelta (denormalizado para filtrar rápido). */
    private Long universidadId;

    @Builder.Default
    private Boolean aprobadoPorAdmin = false;

    @Builder.Default
    private Double calificacion = 5.0;

    @Builder.Default
    private Integer numResenas = 0;

    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;

    /**
     * Contador de vistas del detalle. Incrementado de forma asíncrona desde
     * el endpoint público; no se debe actualizar de manera síncrona en cada GET.
     */
    @Builder.Default
    @Column(name = "vistas", nullable = false)
    private Long vistas = 0L;

    /**
     * Fecha/hora en que un borrador debe publicarse automáticamente (publicación programada).
     * Null = sin programar. Solo aplica a propiedades en estado BORRADOR; un scheduler las
     * publica (BORRADOR→PENDIENTE) cuando llega el momento.
     */
    private LocalDateTime fechaPublicacionProgramada;

    /**
     * Última vez que el arrendador confirmó que el aviso sigue vigente (#49 caducidad).
     * Se setea al crear/aprobar y se renueva con "Confirmar disponibilidad".
     */
    private LocalDateTime fechaUltimaConfirmacion;

    /**
     * Marca puesta por el scheduler cuando el aviso lleva demasiado sin reconfirmarse.
     * No oculta la propiedad (no destructivo): solo pide al arrendador re-confirmar.
     */
    @Builder.Default
    @org.hibernate.annotations.ColumnDefault("false")
    private Boolean requiereReconfirmacion = false;

    @Version
    @Column(nullable = false)
    private Long version;

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
        fechaActualizacion = LocalDateTime.now();
        if (estado == null)           estado = EstadoPropiedad.PENDIENTE;
        if (estaDisponible == null)   estaDisponible = true;
        if (aprobadoPorAdmin == null) aprobadoPorAdmin = false;
        if (calificacion == null)     calificacion = 5.0;
        if (numResenas == null)       numResenas = 0;
        if (vistas == null)           vistas = 0L;
        if (requiereReconfirmacion == null) requiereReconfirmacion = false;
        if (fechaUltimaConfirmacion == null) fechaUltimaConfirmacion = fechaCreacion;
        if (politicaCancelacion == null)
            politicaCancelacion = com.alquilaya.serviciopropiedades.enums.PoliticaCancelacion.FLEXIBLE;
    }

    @PreUpdate
    protected void onUpdate() {
        fechaActualizacion = LocalDateTime.now();
    }

    /**
     * Deriva {@code serviciosIncluidos} (los que están INCLUIDO) desde la lista {@code servicios}
     * con estado. Si {@code servicios} está vacío, no toca {@code serviciosIncluidos} (compat con
     * el formato anterior que solo enviaba la lista plana). Llamar tras setear {@code servicios}.
     */
    public void sincronizarServiciosIncluidos() {
        if (servicios == null || servicios.isEmpty()) {
            return;
        }
        java.util.List<String> incluidos = new ArrayList<>();
        for (ServicioPropiedad s : servicios) {
            if (s != null && s.getEstado() == com.alquilaya.serviciopropiedades.enums.EstadoServicio.INCLUIDO
                    && s.getServicio() != null) {
                incluidos.add(s.getServicio());
            }
        }
        if (serviciosIncluidos == null) {
            serviciosIncluidos = new ArrayList<>();
        }
        serviciosIncluidos.clear();
        serviciosIncluidos.addAll(incluidos);
    }
}
