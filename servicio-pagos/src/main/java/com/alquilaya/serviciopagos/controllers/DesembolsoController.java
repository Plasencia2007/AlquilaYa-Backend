package com.alquilaya.serviciopagos.controllers;

import com.alquilaya.serviciopagos.config.CurrentUser;
import com.alquilaya.serviciopagos.entities.Desembolso;
import com.alquilaya.serviciopagos.services.DesembolsoService;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * G1: payout al arrendador. Endpoints admin (generar/gestionar desembolsos) + self-service
 * del arrendador (ver su propio saldo e historial). Ver {@link DesembolsoService} para el
 * alcance real (v1 admin-mediado, no mueve dinero real vía MercadoPago).
 */
@RestController
@RequestMapping("/api/v1/pagos")
@RequiredArgsConstructor
public class DesembolsoController {

    private final DesembolsoService desembolsoService;

    @GetMapping("/admin/desembolsos/pendientes")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<Long, BigDecimal> pendientesPorArrendador() {
        return desembolsoService.resumenPendiente();
    }

    @PostMapping("/admin/desembolsos/{arrendadorId}/generar")
    @PreAuthorize("hasRole('ADMIN')")
    public Desembolso generar(@PathVariable Long arrendadorId) {
        return desembolsoService.generar(arrendadorId);
    }

    @PostMapping("/admin/desembolsos/{id}/marcar-procesado")
    @PreAuthorize("hasRole('ADMIN')")
    public Desembolso marcarProcesado(@PathVariable Long id, @RequestBody MarcarProcesadoRequest req,
            @AuthenticationPrincipal CurrentUser current) {
        return desembolsoService.marcarProcesado(id, req.getMetodoPago(), req.getReferencia(),
                current != null ? current.getUserId() : null);
    }

    @PostMapping("/admin/desembolsos/{id}/marcar-fallido")
    @PreAuthorize("hasRole('ADMIN')")
    public Desembolso marcarFallido(@PathVariable Long id, @RequestBody MarcarFallidoRequest req) {
        return desembolsoService.marcarFallido(id, req.getMotivo());
    }

    /** El arrendador ve su propio historial de desembolsos (transparencia). */
    @GetMapping("/arrendador/desembolsos")
    @PreAuthorize("hasRole('ARRENDADOR')")
    public List<Desembolso> misDesembolsos(@AuthenticationPrincipal CurrentUser current) {
        if (current == null || current.getPerfilId() == null) {
            throw new IllegalStateException("Sin perfilId en contexto");
        }
        return desembolsoService.historialDelArrendador(current.getPerfilId());
    }

    @Data
    public static class MarcarProcesadoRequest {
        @NotBlank(message = "El método de pago es obligatorio")
        private String metodoPago;
        private String referencia;
    }

    @Data
    public static class MarcarFallidoRequest {
        @NotBlank(message = "El motivo es obligatorio")
        private String motivo;
    }
}
