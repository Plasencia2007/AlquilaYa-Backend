package com.alquilaya.serviciopagos.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ReservaDetalleDTO {
    private Long id;
    private Long propiedadId;
    private String propiedadTitulo;
    private String estudianteNombre;
    private String estudianteCorreo;
    private BigDecimal montoTotal;
    private String estado;
}
