package com.alquilaya.serviciopagos.controllers;

import com.alquilaya.serviciopagos.config.CurrentUser;
import com.alquilaya.serviciopagos.dto.CrearCuponRequest;
import com.alquilaya.serviciopagos.dto.EstadoPagoResponse;
import com.alquilaya.serviciopagos.dto.NpsRequestDTO;
import com.alquilaya.serviciopagos.dto.PagoArrendadorHistorialDTO;
import com.alquilaya.serviciopagos.dto.PagoFallidoDTO;
import com.alquilaya.serviciopagos.dto.PagoHistorialDTO;
import com.alquilaya.serviciopagos.dto.ResumenFinancieroDTO;
import com.alquilaya.serviciopagos.dto.ValidarCuponRequest;
import com.alquilaya.serviciopagos.dto.ValidarCuponResponse;
import com.alquilaya.serviciopagos.entities.Cupon;
import com.alquilaya.serviciopagos.entities.NpsRespuesta;
import com.alquilaya.serviciopagos.services.CuponService;
import com.alquilaya.serviciopagos.services.NpsService;
import com.alquilaya.serviciopagos.services.PagoService;
import com.alquilaya.serviciopagos.services.ReconciliacionService;
import com.alquilaya.serviciopagos.services.ResumenFinancieroService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/pagos")
@RequiredArgsConstructor
public class PagoController {

    private final PagoService pagoService;
    private final ResumenFinancieroService resumenFinancieroService;
    private final ReconciliacionService reconciliacionService;
    private final NpsService npsService;
    private final CuponService cuponService;

    /** Ítem 292: {@code cuponCodigo} es opcional — sin body o sin ese campo, se paga sin cupón. */
    @PostMapping("/preferencia/{reservaId}")
    public ResponseEntity<Map<String, String>> crearPreferencia(@PathVariable Long reservaId,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal CurrentUser current) {
        String cuponCodigo = body != null ? body.get("cuponCodigo") : null;
        String initPoint = pagoService.crearPreferencia(reservaId, current, cuponCodigo);
        return ResponseEntity.ok(Map.of("url", initPoint));
    }

    /** Ítem 276: public key de Mercado Pago para inicializar el SDK Bricks en el navegador. */
    @GetMapping("/mercadopago/public-key")
    public ResponseEntity<Map<String, String>> publicKey() {
        return ResponseEntity.ok(Map.of("publicKey", pagoService.obtenerPublicKey()));
    }

    /**
     * Ítem 276: cobro directo vía Payment Brick embebido (alternativa a Checkout Pro). El body es
     * el {@code formData} que el Brick arma en {@code onSubmit} (token, payment_method_id,
     * installments, issuer_id, payer). No crea ninguna Preference — dispara el Payment directo
     * contra Mercado Pago y devuelve su estado inmediato para que el Brick lo renderice; el webhook
     * sigue siendo quien confirma el pago de verdad (igual que Checkout Pro).
     */
    @PostMapping("/bricks/procesar/{reservaId}")
    public ResponseEntity<Map<String, Object>> procesarPagoBricks(@PathVariable Long reservaId,
            @RequestBody Map<String, Object> formData,
            @AuthenticationPrincipal CurrentUser current) {
        return ResponseEntity.ok(pagoService.procesarPagoDirectoBricks(reservaId, current, formData));
    }

    /** Ítem 292: preview del descuento de un cupón antes de confirmar el pago (Checkout Pro). */
    @PostMapping("/cupones/validar")
    public ResponseEntity<ValidarCuponResponse> validarCupon(@RequestBody ValidarCuponRequest request,
            @AuthenticationPrincipal CurrentUser current) {
        return ResponseEntity.ok(pagoService.validarCupon(request, current));
    }

    /** Ítem 292: alta de cupón. Solo ADMIN. */
    @PostMapping("/admin/cupones")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Cupon> crearCupon(@RequestBody CrearCuponRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cuponService.crear(request));
    }

    /** Ítem 292: listado de cupones (más reciente primero). Solo ADMIN. */
    @GetMapping("/admin/cupones")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Cupon>> listarCupones() {
        return ResponseEntity.ok(cuponService.listar());
    }

    /** Pago dividido (#38 Fase 2): genera el link para la cuota del miembro actual. */
    @PostMapping("/preferencia-grupo/{reservaId}")
    public ResponseEntity<Map<String, String>> crearPreferenciaGrupo(@PathVariable Long reservaId,
            @AuthenticationPrincipal CurrentUser current) {
        String initPoint = pagoService.crearPreferenciaGrupo(reservaId, current);
        return ResponseEntity.ok(Map.of("url", initPoint));
    }

    /** Estado del último pago de una reserva. Para polling del frontend mientras se paga en MP. */
    @GetMapping("/estado/{reservaId}")
    public ResponseEntity<EstadoPagoResponse> estadoPago(@PathVariable Long reservaId,
            @AuthenticationPrincipal CurrentUser current) {
        return ResponseEntity.ok(pagoService.consultarEstado(reservaId, current));
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> recibirNotificacion(
            @RequestHeader(value = "x-signature", required = false) String xSignature,
            @RequestHeader(value = "x-request-id", required = false) String xRequestId,
            @RequestParam(value = "data.id", required = false) String dataIdQuery,
            @RequestBody Map<String, Object> payload) {
        pagoService.procesarWebhook(xSignature, xRequestId, dataIdQuery, payload);
        return ResponseEntity.ok().build();
    }

    /** Resumen financiero de plataforma (ingreso por comisiones, montos cobrados). Solo ADMIN. */
    @GetMapping("/admin/resumen")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResumenFinancieroDTO> resumenFinanciero() {
        return ResponseEntity.ok(resumenFinancieroService.calcular());
    }

    /**
     * Ítem 351: pagos que requieren atención manual (RECHAZADO, DISCREPANCIA,
     * PENDIENTE_REVISION) — una de las 5 fuentes del panel de alertas del admin. Solo ADMIN.
     */
    @GetMapping("/admin/fallidos")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PagoFallidoDTO>> pagosFallidos() {
        return ResponseEntity.ok(pagoService.listarFallidosAdmin());
    }

    /**
     * Reconciliación on-demand (G5): re-consulta Mercado Pago y concilia los pagos en
     * PENDIENTE_REVISION/DISCREPANCIA de una reserva. Solo ADMIN (además del filtro de seguridad
     * sobre {@code /api/v1/pagos/admin/**}).
     */
    @PostMapping("/admin/reconciliar/{reservaId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> reconciliarReserva(@PathVariable Long reservaId) {
        ReconciliacionService.Resumen r = reconciliacionService.reconciliarReserva(reservaId);
        return ResponseEntity.ok(Map.of(
                "reservaId", reservaId,
                "escaneados", r.escaneados,
                "conciliados", r.conciliados,
                "sinCambio", r.sinCambio,
                "revisionManual", r.revisionManual,
                "fallidos", r.fallidos));
    }

    /**
     * Ítem 370: estado del último pago de una reserva para la herramienta admin de
     * reconciliación — mismo shape que {@link #estadoPago}, pero sin la restricción anti-IDOR
     * (ve cualquier reserva, no solo la propia). Solo ADMIN.
     */
    @GetMapping("/admin/reserva/{reservaId}/pago")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EstadoPagoResponse> estadoPagoAdmin(@PathVariable Long reservaId) {
        return ResponseEntity.ok(pagoService.consultarEstadoAdmin(reservaId));
    }

    /** Ítem 279: historial paginado de pagos del estudiante autenticado, más reciente primero. */
    @GetMapping("/mis")
    public ResponseEntity<Page<PagoHistorialDTO>> misPagos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal CurrentUser current) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        return ResponseEntity.ok(pagoService.listarMisPagos(current, pageable));
    }

    /**
     * Ítem 280: PDF del comprobante del pago PAGADO de la reserva. Misma validación de propiedad
     * (dueño del pago) que hace {@code PagoService#generarComprobantePdf} — 403 si no coincide.
     */
    @GetMapping("/reserva/{reservaId}/comprobante")
    public ResponseEntity<byte[]> comprobante(@PathVariable Long reservaId,
            @AuthenticationPrincipal CurrentUser current) {
        byte[] pdf = pagoService.generarComprobantePdf(reservaId, current);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "application/pdf")
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"comprobante-reserva-" + reservaId + ".pdf\"")
                .body(pdf);
    }

    /** Ítem 298: encuesta NPS post-transacción. Cualquier usuario autenticado registra la suya. */
    @PostMapping("/nps")
    public ResponseEntity<NpsRespuesta> enviarNps(@RequestBody NpsRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(npsService.registrar(request));
    }

    /**
     * Ítem 318: historial de pagos PAGADOs del arrendador autenticado con {@code fechaPago} real
     * (self-service, fuera de {@code /admin/**}). Anti-IDOR: {@link PagoService#listarHistorialArrendador}
     * filtra siempre por {@code current.getPerfilId()}, nunca por un id de path/body.
     */
    @GetMapping("/arrendador/historial")
    @PreAuthorize("hasRole('ARRENDADOR')")
    public ResponseEntity<List<PagoArrendadorHistorialDTO>> historialArrendador(
            @AuthenticationPrincipal CurrentUser current) {
        return ResponseEntity.ok(pagoService.listarHistorialArrendador(current));
    }
}
