package com.alquilaya.serviciopagos.controllers;

import com.alquilaya.serviciopagos.services.PagoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/pagos")
@RequiredArgsConstructor
public class PagoController {

    private final PagoService pagoService;

    @PostMapping("/preferencia/{reservaId}")
    public ResponseEntity<Map<String, String>> crearPreferencia(@PathVariable Long reservaId) {
        String initPoint = pagoService.crearPreferencia(reservaId);
        return ResponseEntity.ok(Map.of("url", initPoint));
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
}
