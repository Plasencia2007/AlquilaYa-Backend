package com.alquilaya.serviciopagos.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * Resumen financiero de plataforma para el panel del admin, calculado sobre los pagos PAGADOS.
 * {@code totalComision} es el ingreso de AlquilaYa; {@code totalArrendador} lo que reciben los
 * arrendadores; {@code totalCobrado} lo que pagaron los estudiantes (suma de ambos).
 */
@Data
@Builder
public class ResumenFinancieroDTO {

    private BigDecimal totalCobrado;
    private BigDecimal totalComision;
    private BigDecimal totalArrendador;
    private long numPagos;
    private List<FilaMes> porMes;

    @Data
    @Builder
    public static class FilaMes {
        private String mes; // YYYY-MM
        private BigDecimal cobrado;
        private BigDecimal comision;
        private BigDecimal arrendador;
        private long numPagos;
    }
}
