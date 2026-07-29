package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.ResumenEventoAnalyticsDTO;
import com.alquilaya.serviciousuarios.services.EventoAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Panel admin, base para un futuro dashboard, de la telemetría de analítica CLIENTE (ítem 455).
 * Sólo agrega conteos por tipo de evento en un rango de fechas ({@code GROUP BY evento}) --
 * suficiente para verificar que la ingesta funciona; no es un dashboard completo.
 *
 * <p>Ruta bajo {@code /api/v1/usuarios/admin/**}: {@code SecurityConfig} ya exige rol ADMIN para
 * ese prefijo (cae en el matcher {@code /api/v1/usuarios/** -> hasRole('ADMIN')}); el
 * {@code @PreAuthorize} de método lo refuerza. No requiere tocar {@code SecurityConfig}.</p>
 */
@RestController
@RequestMapping("/api/v1/usuarios/admin/analytics")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final EventoAnalyticsService service;

    /**
     * Conteo de eventos por tipo dentro de {@code [desde, hasta]} (fechas inclusive, sin hora).
     * Ambos parámetros son opcionales: por defecto, últimos 7 días hasta hoy.
     */
    @GetMapping("/resumen")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ResumenEventoAnalyticsDTO>> resumen(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        LocalDate hastaFecha = hasta != null ? hasta : LocalDate.now();
        LocalDate desdeFecha = desde != null ? desde : hastaFecha.minusDays(7);

        LocalDateTime desdeDt = desdeFecha.atStartOfDay();
        LocalDateTime hastaDt = hastaFecha.plusDays(1).atStartOfDay(); // límite exclusivo: incluye todo "hasta"

        return ResponseEntity.ok(service.resumen(desdeDt, hastaDt));
    }
}
