package com.alquilaya.api_gateway.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @RequestMapping("/general")
    public ResponseEntity<Map<String, Object>> generalFallback() {
        return buildErrorResponse("El servicio no está disponible temporalmente.");
    }

    @RequestMapping("/usuarios")
    public ResponseEntity<Map<String, Object>> usuariosFallback() {
        return buildErrorResponse("El servicio de usuarios está inactivo. Inténtalo de nuevo más tarde.");
    }

    @RequestMapping("/pagos")
    public ResponseEntity<Map<String, Object>> pagosFallback() {
        return buildErrorResponse("El servicio de pagos está experimentando demoras. Por favor, intenta de nuevo más tarde.");
    }

    @RequestMapping("/propiedades")
    public ResponseEntity<Map<String, Object>> propiedadesFallback() {
        return buildErrorResponse("El catálogo de propiedades está temporalmente fuera de servicio.");
    }

    @RequestMapping("/catalogos")
    public ResponseEntity<Map<String, Object>> catalogosFallback() {
        return buildErrorResponse("El servicio de catálogos no responde.");
    }

    @RequestMapping("/mensajeria")
    public ResponseEntity<Map<String, Object>> mensajeriaFallback() {
        return buildErrorResponse("El servicio de mensajería no está disponible temporalmente.");
    }

    private ResponseEntity<Map<String, Object>> buildErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", LocalDateTime.now());
        response.put("status", HttpStatus.SERVICE_UNAVAILABLE.value());
        response.put("error", "Service Unavailable");
        response.put("message", message);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
    }
}
