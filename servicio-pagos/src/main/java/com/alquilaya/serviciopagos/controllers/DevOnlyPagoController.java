package com.alquilaya.serviciopagos.controllers;

import com.alquilaya.serviciopagos.services.PagoService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Endpoints de desarrollo. Bean solo se registra cuando el profile activo NO es "prod".
@Profile("!prod")
@RestController
@RequestMapping("/api/v1/pagos")
@RequiredArgsConstructor
public class DevOnlyPagoController {

    private final PagoService pagoService;

    @PostMapping("/simular-exito/{reservaId}")
    public ResponseEntity<String> simularExito(@PathVariable Long reservaId) {
        pagoService.simularPagoExitoso(reservaId);
        return ResponseEntity.ok("Simulación de pago exitoso enviada a Kafka para reserva: " + reservaId);
    }
}
