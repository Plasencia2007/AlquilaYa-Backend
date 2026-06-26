package com.alquilaya.serviciopropiedades.dto;

import java.math.BigDecimal;

/**
 * Cuota de un miembro en una reserva grupal (#38 Fase 2). La consume servicio-pagos para
 * cobrar la parte del miembro, y el frontend para el progreso de pago.
 */
public record CuotaPagoDTO(
        Long reservaId,
        Long grupoId,
        Long estudianteId,
        BigDecimal monto,
        String estado,
        String propiedadTitulo,
        String estudianteNombre,
        String estudianteCorreo) {
}
