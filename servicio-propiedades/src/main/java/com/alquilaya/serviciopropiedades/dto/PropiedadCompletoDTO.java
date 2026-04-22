package com.alquilaya.serviciopropiedades.dto;

import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import com.alquilaya.serviciopropiedades.enums.PeriodoAlquiler;
import com.alquilaya.serviciopropiedades.enums.TipoPropiedad;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class PropiedadCompletoDTO {
    private Long id;
    private String titulo;
    private String descripcion;
    private BigDecimal precio;
    private String direccion;
    private TipoPropiedad tipoPropiedad;
    private PeriodoAlquiler periodoAlquiler;
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
    private String arrendadorTelefono;
    private String arrendadorCorreo;
}
