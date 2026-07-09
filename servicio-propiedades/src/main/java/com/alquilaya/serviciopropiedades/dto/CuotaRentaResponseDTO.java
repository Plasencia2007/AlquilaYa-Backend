package com.alquilaya.serviciopropiedades.dto;

import com.alquilaya.serviciopropiedades.entities.CuotaRenta;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Vista de lectura de una cuota mensual de renta (G2). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CuotaRentaResponseDTO {

    private Long id;
    private Long reservaId;
    private Integer numeroCuota;
    private String periodo;
    private BigDecimal monto;
    private String estado;
    private LocalDate fechaVencimiento;
    private LocalDate fechaPago;
    private Boolean recordatorioEnviado;
    private LocalDateTime fechaCreacion;

    public static CuotaRentaResponseDTO from(CuotaRenta c) {
        return CuotaRentaResponseDTO.builder()
                .id(c.getId())
                .reservaId(c.getReservaId())
                .numeroCuota(c.getNumeroCuota())
                .periodo(c.getPeriodo())
                .monto(c.getMonto())
                .estado(c.getEstado() != null ? c.getEstado().name() : null)
                .fechaVencimiento(c.getFechaVencimiento())
                .fechaPago(c.getFechaPago())
                .recordatorioEnviado(c.getRecordatorioEnviado())
                .fechaCreacion(c.getFechaCreacion())
                .build();
    }
}
