package com.alquilaya.serviciopagos.exceptions;

import com.alquilaya.serviciopagos.dto.ErrorResponse;
import feign.FeignException;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDateTime;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(WebhookInvalidoException.class)
    public ResponseEntity<ErrorResponse> handleWebhookInvalido(
            WebhookInvalidoException ex, HttpServletRequest req) {
        // 400 — rechazamos el webhook. Mercado Pago no reintenta en 4xx,
        // que es lo que queremos cuando falla la firma o el payload está mal.
        log.warn("Webhook rechazado: {}", ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), req);
    }

    @ExceptionHandler({
            IllegalArgumentException.class,
            HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class
    })
    public ResponseEntity<ErrorResponse> handleBadRequest(Exception ex, HttpServletRequest req) {
        String mensaje = ex.getMessage();
        if (ex instanceof HttpMessageNotReadableException) {
            mensaje = "El cuerpo de la petición no es un JSON válido.";
        } else if (ex instanceof MethodArgumentTypeMismatchException tm) {
            mensaje = "Parámetro '" + tm.getName() + "' con valor '" + tm.getValue()
                    + "' no es del tipo esperado.";
        }
        return build(HttpStatus.BAD_REQUEST, mensaje, req);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleConflict(
            IllegalStateException ex, HttpServletRequest req) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), req);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(
            DataIntegrityViolationException ex, HttpServletRequest req) {
        log.warn("Violación de integridad en pagos: {}", ex.getMostSpecificCause().getMessage());
        return build(HttpStatus.CONFLICT,
                "No se pudo guardar: conflicto con datos existentes.", req);
    }

    @ExceptionHandler(CallNotPermittedException.class)
    public ResponseEntity<ErrorResponse> handleCircuitOpen(
            CallNotPermittedException ex, HttpServletRequest req) {
        log.warn("Circuit breaker abierto: {}", ex.getMessage());
        return build(HttpStatus.SERVICE_UNAVAILABLE,
                "Servicio dependiente temporalmente no disponible. Reintenta en unos segundos.", req);
    }

    @ExceptionHandler(FeignException.class)
    public ResponseEntity<ErrorResponse> handleFeign(FeignException ex, HttpServletRequest req) {
        log.warn("Error llamando a servicio remoto via Feign: status={} msg={}", ex.status(), ex.getMessage());
        HttpStatus status = switch (ex.status()) {
            case 404 -> HttpStatus.NOT_FOUND;
            case 401, 403 -> HttpStatus.BAD_GATEWAY;
            default -> HttpStatus.BAD_GATEWAY;
        };
        return build(status, "Error comunicándose con servicio dependiente.", req);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex, HttpServletRequest req) {
        log.error("Error interno no manejado en {}", req.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR,
                "Error interno del servidor. Intenta nuevamente.", req);
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String mensaje, HttpServletRequest req) {
        return ResponseEntity.status(status.value()).body(ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .error(status.getReasonPhrase())
                .message(mensaje)
                .path(req.getRequestURI())
                .build());
    }
}
