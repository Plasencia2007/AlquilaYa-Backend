package com.alquilaya.serviciopropiedades.exceptions;

import com.alquilaya.serviciopropiedades.dto.ErrorResponse;
import feign.FeignException;
import io.github.resilience4j.bulkhead.BulkheadFullException;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(err -> {
            String field = (err instanceof FieldError fe) ? fe.getField() : err.getObjectName();
            errors.put(field, err.getDefaultMessage());
        });
        return build(HttpStatus.BAD_REQUEST,
                "Uno o más campos no pasaron la validación. Revisa validationErrors.",
                req, errors);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraint(ConstraintViolationException ex, HttpServletRequest req) {
        Map<String, String> errors = new HashMap<>();
        ex.getConstraintViolations().forEach(v -> errors.put(v.getPropertyPath().toString(), v.getMessage()));
        return build(HttpStatus.BAD_REQUEST, "Uno o más parámetros no pasaron la validación.", req, errors);
    }

    @ExceptionHandler({ IllegalArgumentException.class, HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class })
    public ResponseEntity<ErrorResponse> handleBadRequest(Exception ex, HttpServletRequest req) {
        String msg = ex.getMessage();
        if (ex instanceof HttpMessageNotReadableException) {
            msg = "El cuerpo de la petición no es un JSON válido o tiene campos con tipos incorrectos.";
        } else if (ex instanceof MethodArgumentTypeMismatchException tm) {
            msg = "El parámetro '" + tm.getName() + "' con valor '" + tm.getValue() + "' no es del tipo esperado.";
        }
        return build(HttpStatus.BAD_REQUEST, msg, req, null);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleConflict(IllegalStateException ex, HttpServletRequest req) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), req, null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleForbidden(AccessDeniedException ex, HttpServletRequest req) {
        return build(HttpStatus.FORBIDDEN,
                "No tienes permisos para ejecutar esta acción.", req, null);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxSize(MaxUploadSizeExceededException ex, HttpServletRequest req) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE,
                "El archivo excede el tamaño máximo permitido.", req, null);
    }

    @ExceptionHandler(CallNotPermittedException.class)
    public ResponseEntity<ErrorResponse> handleCircuitOpen(CallNotPermittedException ex, HttpServletRequest req) {
        log.warn("Circuit breaker abierto: {}", ex.getMessage());
        return build(HttpStatus.SERVICE_UNAVAILABLE,
                "Servicio dependiente temporalmente no disponible. Reintenta en unos segundos.", req, null);
    }

    @ExceptionHandler(BulkheadFullException.class)
    public ResponseEntity<ErrorResponse> handleBulkheadFull(BulkheadFullException ex, HttpServletRequest req) {
        log.warn("Bulkhead lleno: {}", ex.getMessage());
        return build(HttpStatus.TOO_MANY_REQUESTS,
                "Demasiadas solicitudes concurrentes hacia el servicio dependiente. Reintenta en breve.", req, null);
    }

    @ExceptionHandler(java.util.concurrent.TimeoutException.class)
    public ResponseEntity<ErrorResponse> handleTimeout(java.util.concurrent.TimeoutException ex, HttpServletRequest req) {
        log.warn("Timeout llamando a servicio dependiente: {}", ex.getMessage());
        return build(HttpStatus.GATEWAY_TIMEOUT,
                "El servicio dependiente tardó demasiado en responder.", req, null);
    }

    @ExceptionHandler(FeignException.class)
    public ResponseEntity<ErrorResponse> handleFeign(FeignException ex, HttpServletRequest req) {
        log.warn("Error Feign: status={} msg={}", ex.status(), ex.getMessage());
        HttpStatus status = switch (ex.status()) {
            case 404 -> HttpStatus.NOT_FOUND;
            case 401, 403 -> HttpStatus.BAD_GATEWAY;
            default -> HttpStatus.BAD_GATEWAY;
        };
        return build(status, "Error comunicándose con servicio dependiente.", req, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex, HttpServletRequest req) {
        log.error("Error interno no manejado en {}", req.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR,
                "Error interno del servidor. Intenta nuevamente.", req, null);
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String msg,
                                                 HttpServletRequest req, Map<String, String> errors) {
        return ResponseEntity.status(status).body(ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .error(status.getReasonPhrase())
                .message(msg)
                .path(req.getRequestURI())
                .validationErrors(errors)
                .build());
    }
}
