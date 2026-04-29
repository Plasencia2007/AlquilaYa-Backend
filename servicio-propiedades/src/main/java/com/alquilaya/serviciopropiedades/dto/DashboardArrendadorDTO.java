package com.alquilaya.serviciopropiedades.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardArrendadorDTO {
    private BigDecimal ingresosMesActual;
    private BigDecimal ingresosMesAnterior;
    private Double tasaOcupacion;
    private Long totalPropiedades;
    private Long propiedadesActivas;
    private Long vistasUltimos30Dias;
    private Long mensajesSinLeer;
    private Long reservasPendientes;
    private Long reservasActivas;
    private List<ActividadDTO> actividadReciente;
    private List<IngresoMensualDTO> ingresosPorMes;
}
