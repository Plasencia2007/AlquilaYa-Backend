package com.alquilaya.serviciousuarios.clients;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Ítem 354: espejo LOCAL de {@code servicio-pagos}
 * {@code com.alquilaya.serviciopagos.dto.ResumenFinancieroDTO} — misma forma exacta (campo a
 * campo), para deserializar la respuesta de {@link PagosClient#obtenerResumenFinanciero()}.
 * Mismo patrón que {@link CampusPrincipalDTO} ("DTO local que espeja la respuesta de otro
 * servicio"): constructores explícitos porque Jackson (vía el decoder de Feign) necesita cómo
 * instanciarlo al deserializar.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumenFinancieroDTO {

    private BigDecimal totalCobrado;
    private BigDecimal totalComision;
    private BigDecimal totalArrendador;
    private long numPagos;
    private List<FilaMes> porMes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FilaMes {
        private String mes; // YYYY-MM
        private BigDecimal cobrado;
        private BigDecimal comision;
        private BigDecimal arrendador;
        private long numPagos;
    }
}
