package com.alquilaya.serviciopagos.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Cuota del miembro en una reserva grupal (#38 Fase 2), traída de servicio-propiedades. */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CuotaPagoDTO {
    private Long reservaId;
    private Long grupoId;
    private Long estudianteId;
    private BigDecimal monto;
    private String estado;
    private String propiedadTitulo;
    private String estudianteNombre;
    private String estudianteCorreo;
}
