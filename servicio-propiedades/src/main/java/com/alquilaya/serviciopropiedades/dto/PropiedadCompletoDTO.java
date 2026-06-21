package com.alquilaya.serviciopropiedades.dto;

import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PropiedadCompletoDTO {
    private Long id;
    private String titulo;
    private String descripcion;
    private BigDecimal precio;
    /** Precio antes de la última rebaja (para tachado en UI). Null si no hubo rebaja. */
    private BigDecimal precioAnterior;
    /** Enlace de video (YouTube/Vimeo/.mp4). Null si no tiene. */
    private String videoUrl;
    private String direccion;
    private String tipoPropiedad;
    private String periodoAlquiler;
    private Double area;
    private Integer nroPiso;
    private Integer numDormitorios;
    private Integer numBanos;
    private Integer capacidadPersonas;
    private Boolean tieneSala;
    private Boolean tieneCocina;
    private Boolean amoblado;
    private Boolean gestionPorHabitacion;
    private Boolean estaDisponible;
    private LocalDate disponibleDesde;
    /** Política de cancelación (FLEXIBLE/MODERADA/ESTRICTA). */
    private com.alquilaya.serviciopropiedades.enums.PoliticaCancelacion politicaCancelacion;
    private List<String> serviciosIncluidos;
    private List<com.alquilaya.serviciopropiedades.entities.ServicioPropiedad> servicios;
    private List<String> reglas;
    private Double latitud;
    private Double longitud;
    private Integer distanciaMetros;
    private Boolean aprobadoPorAdmin;
    private Double calificacion;
    private Integer numResenas;
    private EstadoPropiedad estado;
    private List<String> imagenes;
    private Long arrendadorId;
    private String arrendadorNombre;
    private String arrendadorTelefono;
    private String arrendadorCorreo;
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
