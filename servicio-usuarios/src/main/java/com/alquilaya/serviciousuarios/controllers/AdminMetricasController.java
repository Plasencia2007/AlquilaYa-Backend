package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.MetricasAgregadoDTO;
import com.alquilaya.serviciousuarios.dto.RegistroSemanalDTO;
import com.alquilaya.serviciousuarios.services.AdminMetricasAgregadoService;
import com.alquilaya.serviciousuarios.services.UsuarioMetricasService;
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
 * Ítem 386: gráfica de crecimiento de usuarios del panel admin ({@code metrics/page.tsx}).
 * Ítem 354: endpoint agregado ({@link #metricasAgregadas()}) que reemplaza las 6 llamadas
 * client-side (una por microservicio, vía {@code Promise.allSettled}) que antes hacía esa misma
 * página — ver {@link AdminMetricasAgregadoService} para el detalle de la agregación y su
 * resiliencia ante fallos parciales de servicio-pagos/servicio-propiedades.
 *
 * <p>Ruta bajo {@code /api/v1/usuarios/admin/**}: {@code SecurityConfig} ya exige rol ADMIN para
 * ese prefijo (cae en el matcher {@code /api/v1/usuarios/** -> hasRole('ADMIN')}); el
 * {@code @PreAuthorize} de método lo refuerza. No requiere tocar {@code SecurityConfig}.</p>
 */
@RestController
@RequestMapping("/api/v1/usuarios/admin/metricas")
@RequiredArgsConstructor
public class AdminMetricasController {

    private final UsuarioMetricasService usuarioMetricasService;
    private final AdminMetricasAgregadoService adminMetricasAgregadoService;

    /**
     * Ítem 354: resumen financiero (servicio-pagos) + conteo de propiedades pendientes
     * (servicio-propiedades) + usuarios por rol + registros por semana (ambos locales), en una
     * sola respuesta. Si servicio-pagos o servicio-propiedades están caídos, esa sección llega
     * {@code null} pero el resto de la respuesta sigue presente (ver
     * {@link AdminMetricasAgregadoService}) — nunca un 500 completo por un fallo parcial.
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MetricasAgregadoDTO> metricasAgregadas() {
        return ResponseEntity.ok(adminMetricasAgregadoService.obtenerMetricasAgregadas());
    }

    /**
     * Registros agrupados por semana dentro de {@code [desde, hasta]} (fechas inclusive, sin
     * hora). Ambos parámetros son opcionales: por defecto, últimas 12 semanas hasta hoy — mismo
     * patrón de defaults que {@code AdminAnalyticsController#resumen}.
     */
    @GetMapping("/registros")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RegistroSemanalDTO>> registrosPorSemana(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        LocalDate hastaFecha = hasta != null ? hasta : LocalDate.now();
        LocalDate desdeFecha = desde != null ? desde : hastaFecha.minusWeeks(12);

        LocalDateTime desdeDt = desdeFecha.atStartOfDay();
        LocalDateTime hastaDt = hastaFecha.plusDays(1).atStartOfDay(); // límite exclusivo: incluye todo "hasta"

        return ResponseEntity.ok(usuarioMetricasService.registrosPorSemana(desdeDt, hastaDt));
    }
}
