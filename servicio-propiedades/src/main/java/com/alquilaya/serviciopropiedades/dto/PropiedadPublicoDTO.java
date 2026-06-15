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
    private String direccion;
    private String tipoPropiedad;
    private String periodoAlquiler;
    private Double area;
    private Integer nroPiso;
    private Boolean estaDisponible;
    private LocalDate disponibleDesde;
    private List<String> serviciosIncluidos;
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
