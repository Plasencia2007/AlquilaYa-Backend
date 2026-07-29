package com.alquilaya.serviciousuarios.dto;

import com.alquilaya.serviciousuarios.clients.ResumenFinancieroDTO;

import java.util.List;

/**
 * Ítem 354: respuesta ÚNICA de {@code GET /api/v1/usuarios/admin/metricas}, que reemplaza las 6
 * llamadas client-side (vía {@code Promise.allSettled}) que antes hacía {@code metrics/page.tsx}.
 *
 * <p>{@code resumenFinanciero} y {@code propiedadesPendientes} vienen de otros microservicios
 * (Feign, vía {@code AdminMetricasAgregadoService}) y pueden llegar {@code null} si ese servicio
 * remoto está caído — degradación parcial a propósito, mismo espíritu que el
 * {@code Promise.allSettled} que este endpoint reemplaza: un fallo en pagos o propiedades NUNCA
 * debe tumbar el resto de la respuesta. {@code estudiantes}/{@code arrendadores}/{@code admins}/
 * {@code registrosPorSemana} son 100% locales (BD de este servicio) y siempre vienen poblados.
 */
public record MetricasAgregadoDTO(
        ResumenFinancieroDTO resumenFinanciero,
        Long propiedadesPendientes,
        long estudiantes,
        long arrendadores,
        long admins,
        List<RegistroSemanalDTO> registrosPorSemana
) {
}
