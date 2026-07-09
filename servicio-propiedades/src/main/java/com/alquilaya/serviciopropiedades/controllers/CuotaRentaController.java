package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.config.CurrentUserProvider;
import com.alquilaya.serviciopropiedades.dto.CuotaRentaResponseDTO;
import com.alquilaya.serviciopropiedades.services.CuotaRentaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * G2 — Lectura del cronograma de renta mensual recurrente (cuotas) de una reserva,
 * y (re)generación manual para ADMIN.
 *
 * <p>Anidado bajo {@code /api/v1/reservas/**} (misma ruta de gateway que las reservas).
 * La lectura usa {@code isAuthenticated()} + validación de participante/ADMIN en el
 * service (mismo patrón anti-IDOR que GET /reservas/{id}). La (re)generación es
 * ADMIN-only (permiso GESTIONAR_SISTEMA, igual que el marcado manual de pago).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/reservas/{reservaId}/cuotas")
@RequiredArgsConstructor
public class CuotaRentaController {

    private final CuotaRentaService cuotaRentaService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CuotaRentaResponseDTO>> listar(@PathVariable Long reservaId) {
        List<CuotaRentaResponseDTO> cuotas = cuotaRentaService
                .listarPorReserva(reservaId, CurrentUserProvider.get())
                .stream()
                .map(CuotaRentaResponseDTO::from)
                .toList();
        return ResponseEntity.ok(cuotas);
    }

    /** (Re)genera el cronograma de cuotas de la reserva. Idempotente. ADMIN-only. */
    @PostMapping("/generar")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_SISTEMA')")
    public ResponseEntity<Map<String, Object>> generar(@PathVariable Long reservaId) {
        int creadas = cuotaRentaService.generarCuotas(reservaId);
        log.info("[CUOTAS] (Re)generación manual reserva {}: {} cuota(s) creada(s)", reservaId, creadas);
        return ResponseEntity.ok(Map.of("reservaId", reservaId, "cuotasCreadas", creadas));
    }
}
