package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.dto.ZonaResolucionDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Calcula la comisión de plataforma para un cuarto vendido, según la zona en la que cae la
 * propiedad. La configuración de comisión vive en el catálogo de zonas y llega cacheada vía
 * {@link ZonaProvider} (el listener de eventos de catalogos mantiene ese cache fresco).
 *
 * Regla: si la zona tiene monto fijo, ese manda; si no, se aplica el porcentaje sobre el
 * precio del cuarto; si no hay ninguno (o la zona no se encuentra), la comisión es 0.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ComisionService {

    private final ZonaProvider zonaProvider;

    /** Comisión (en soles, 2 decimales) para una venta en la zona dada sobre {@code montoTotal}. */
    public BigDecimal calcular(Long zonaId, BigDecimal montoTotal) {
        if (zonaId == null || montoTotal == null || montoTotal.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        ZonaResolucionDTO zona = buscarZona(zonaId);
        if (zona == null) {
            return BigDecimal.ZERO;
        }
        if (zona.getComisionMonto() != null && zona.getComisionMonto().signum() > 0) {
            return zona.getComisionMonto().setScale(2, RoundingMode.HALF_UP);
        }
        if (zona.getComisionPorcentaje() != null && zona.getComisionPorcentaje() > 0) {
            return montoTotal
                    .multiply(BigDecimal.valueOf(zona.getComisionPorcentaje()))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }
        return BigDecimal.ZERO;
    }

    private ZonaResolucionDTO buscarZona(Long zonaId) {
        List<ZonaResolucionDTO> zonas = zonaProvider.get();
        if (zonas == null) {
            return null;
        }
        return zonas.stream()
                .filter(z -> zonaId.equals(z.getId()))
                .findFirst()
                .orElse(null);
    }
}
