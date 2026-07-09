package com.alquilaya.serviciopagos.controllers;

import com.alquilaya.serviciopagos.entities.Deposito;
import com.alquilaya.serviciopagos.services.DepositoService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * G3: garantía / depósito. Endpoints admin-only por ahora (mismo alcance deliberado que
 * {@link DesembolsoController} — ver {@link DepositoService} para el porqué). Un follow-up
 * puede agregar lectura self-service para estudiante/arrendador sobre su propia reserva.
 */
@RestController
@RequestMapping("/api/v1/pagos/admin/depositos")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DepositoController {

    private final DepositoService depositoService;

    @PostMapping
    public Deposito crear(@RequestBody CrearDepositoRequest req) {
        return depositoService.crear(req.getReservaId(), req.getMonto());
    }

    @PostMapping("/{id}/capturar")
    public Deposito capturar(@PathVariable Long id, @RequestBody(required = false) CapturarRequest req) {
        return depositoService.capturar(id, req != null ? req.getPaymentId() : null);
    }

    @PostMapping("/{id}/devolver")
    public Deposito devolver(@PathVariable Long id) {
        return depositoService.devolver(id);
    }

    @PostMapping("/{id}/retener-parcial")
    public Deposito retenerParcial(@PathVariable Long id, @RequestBody RetenerParcialRequest req) {
        return depositoService.retenerParcial(id, req.getMontoRetenido(), req.getMotivo());
    }

    @PostMapping("/{id}/perder")
    public Deposito perder(@PathVariable Long id, @RequestBody PerderRequest req) {
        return depositoService.marcarPerdido(id, req.getMotivo());
    }

    @GetMapping("/reserva/{reservaId}")
    public List<Deposito> porReserva(@PathVariable Long reservaId) {
        return depositoService.historialDeReserva(reservaId);
    }

    @GetMapping("/arrendador/{arrendadorId}")
    public List<Deposito> porArrendador(@PathVariable Long arrendadorId) {
        return depositoService.historialDelArrendador(arrendadorId);
    }

    @Data
    public static class CrearDepositoRequest {
        @NotNull(message = "reservaId es obligatorio")
        private Long reservaId;
        @NotNull(message = "El monto es obligatorio")
        @Positive(message = "El monto debe ser mayor a cero")
        private BigDecimal monto;
    }

    @Data
    public static class CapturarRequest {
        private String paymentId;
    }

    @Data
    public static class RetenerParcialRequest {
        @NotNull(message = "montoRetenido es obligatorio")
        @Positive(message = "montoRetenido debe ser mayor a cero")
        private BigDecimal montoRetenido;
        @NotBlank(message = "El motivo es obligatorio")
        private String motivo;
    }

    @Data
    public static class PerderRequest {
        @NotBlank(message = "El motivo es obligatorio")
        private String motivo;
    }
}
