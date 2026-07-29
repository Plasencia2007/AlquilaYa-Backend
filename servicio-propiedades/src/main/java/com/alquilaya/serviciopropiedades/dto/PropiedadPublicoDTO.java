package com.alquilaya.serviciopropiedades.dto;

import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

// @NoArgsConstructor + @AllArgsConstructor son necesarios además de @Builder:
// el builder usa el all-args, y Jackson (al leer de la caché Redis) necesita el
// constructor vacío + setters. Sin @NoArgsConstructor, Lombok genera solo el
// all-args y la deserialización falla con "no Creators / default constructor".
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PropiedadPublicoDTO {
    private Long id;
    private String titulo;
    private String descripcion;
    private BigDecimal precio;
    /** Precio antes de la última rebaja (para tachado en UI). Null si no hubo rebaja. */
    private BigDecimal precioAnterior;
    /**
     * Depósito de garantía (S/), adicional a la renta. Null si la propiedad no lo tiene
     * cargado. Junto con {@code precio} y los {@code servicios} en estado APARTE (con su
     * {@code monto}) alimenta el "Costo mensual total estimado" de la ficha pública.
     */
    private BigDecimal deposito;
    /** Precios por temporada/ciclo (solo se cargan en la ficha, no en el listado). */
    private List<PrecioTemporadaDTO> temporadas;
    /** Enlace de video (YouTube/Vimeo/.mp4). Null si no tiene. */
    private String videoUrl;
    private String direccion;
    private String tipoPropiedad;
    private String periodoAlquiler;
    private Double area;
    private Integer nroPiso;
    // Distribución del inmueble (relevante para departamento/mini depa/casa).
    private Integer numDormitorios;
    private Integer numBanos;
    private Integer capacidadPersonas;
    private Boolean tieneSala;
    private Boolean tieneCocina;
    private Boolean amoblado;
    /** Si true, el inmueble se alquila por habitaciones; {@code precio} es el "desde" (mínimo). */
    private Boolean gestionPorHabitacion;
    private Boolean estaDisponible;
    private LocalDate disponibleDesde;
    /** Política de cancelación (FLEXIBLE/MODERADA/ESTRICTA). */
    private com.alquilaya.serviciopropiedades.enums.PoliticaCancelacion politicaCancelacion;
    private List<String> serviciosIncluidos;
    /** Servicios con estado (incluido/aparte/no disponible). */
    private List<com.alquilaya.serviciopropiedades.entities.ServicioPropiedad> servicios;
    private List<String> reglas;
    private Double latitud;
    private Double longitud;
    private Integer distanciaMetros;
    /**
     * Distancia en km desde el punto de búsqueda "cerca de mí" hasta la propiedad,
     * calculada (Haversine) solo por el endpoint {@code GET /buscar/cerca}. Null en el
     * resto de listados. Permite a la UI mostrar "a 1.2 km".
     */
    private Double distanciaKm;
    /** Zona de cobertura y universidad resueltas al publicar (para filtrar/mostrar). */
    private Long zonaId;
    private Long universidadId;
    private Boolean aprobadoPorAdmin;
    private Double calificacion;
    private Integer numResenas;
    private EstadoPropiedad estado;
    private List<String> imagenes;
    private Long arrendadorId;
    private String arrendadorNombre;
    /** Distintivos automáticos calculados (nuevo/popular/última plaza/rebaja). */
    private List<com.alquilaya.serviciopropiedades.enums.BadgePropiedad> badges;

    // ===== Campos premium (card rediseño) =====
    private String arrendadorAvatar;
    private Boolean arrendadorVerificado;
    private LocalDateTime fechaCreacion;
    @Builder.Default
    private Long vistas = 0L;
    private LocalDateTime ultimaActualizacion;
    /**
     * Tiempo de respuesta promedio del arrendador (en minutos). Nullable
     * mientras no exista una métrica calculada; en UI se debe mostrar como "—".
     */
    private Integer tiempoRespuestaArrendador;

    // ===== Score agregado de reputación del arrendador (#26) =====
    private Integer arrendadorScore;
    private String arrendadorNivelReputacion;
}
