package com.alquilaya.serviciopagos.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Ítem 351: fila del panel admin de "pagos fallidos" ({@code GET /api/v1/pagos/admin/fallidos}).
 * Sin enriquecer con el título de la propiedad (a diferencia de {@link PagoHistorialDTO}) — el
 * panel de alertas solo necesita el conteo y datos mínimos para triage, no vale la pena pagar el
 * costo de un Feign a servicio-propiedades por cada fila.
 */
public record PagoFallidoDTO(
        Long id,
        Long reservaId,
        Long estudianteId,
        Long arrendadorId,
        BigDecimal monto,
        String estado,
        LocalDateTime fechaCreacion,
        LocalDateTime fechaPago) {
}
