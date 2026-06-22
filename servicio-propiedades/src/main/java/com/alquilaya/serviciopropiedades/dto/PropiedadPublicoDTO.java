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
}
