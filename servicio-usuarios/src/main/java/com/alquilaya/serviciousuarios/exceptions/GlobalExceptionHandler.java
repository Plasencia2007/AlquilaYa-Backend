package com.alquilaya.serviciousuarios.exceptions;

import com.alquilaya.serviciousuarios.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
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
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(err -> {
            String field = (err instanceof FieldError fe) ? fe.getField() : err.getObjectName();
            errors.put(field, err.getDefaultMessage());
        });
        return build(HttpStatus.BAD_REQUEST,
                "Uno o más campos no pasaron la validación. Revisa el campo validationErrors.",
                req, errors);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraint(
            ConstraintViolationException ex, HttpServletRequest req) {
        Map<String, String> errors = new HashMap<>();
        ex.getConstraintViolations().forEach(v ->
                errors.put(v.getPropertyPath().toString(), v.getMessage()));
        return build(HttpStatus.BAD_REQUEST,
                "Uno o más parámetros no pasaron la validación.", req, errors);
    }

    @ExceptionHandler(RecursoNoEncontradoException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
            RecursoNoEncontradoException ex, HttpServletRequest req) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), req, null);
    }

    @ExceptionHandler(CorreoYaRegistradoException.class)
    public ResponseEntity<ErrorResponse> handleConflict(
            CorreoYaRegistradoException ex, HttpServletRequest req) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), req, null);
    }

    @ExceptionHandler({
            OtpInvalidoException.class,
            DocumentoInvalidoException.class,
            ArchivoInvalidoException.class,
            IllegalArgumentException.class,
            HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class
    })
    public ResponseEntity<ErrorResponse> handleBadRequest(
            Exception ex, HttpServletRequest req) {
        String mensaje = ex.getMessage();
        if (ex instanceof HttpMessageNotReadableException) {
            mensaje = "El cuerpo de la petición no es un JSON válido o tiene campos con tipos incorrectos.";
        } else if (ex instanceof MethodArgumentTypeMismatchException tm) {
            mensaje = "El parámetro '" + tm.getName() + "' con valor '" + tm.getValue()
                    + "' no es del tipo esperado.";
        }
        return build(HttpStatus.BAD_REQUEST, mensaje, req, null);
    }

    @ExceptionHandler(CredencialesInvalidasException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(
            CredencialesInvalidasException ex, HttpServletRequest req) {
        return build(HttpStatus.UNAUTHORIZED, ex.getMessage(), req, null);
    }

    @ExceptionHandler({ TelefonoNoVerificadoException.class, AccesoDenegadoException.class })
    public ResponseEntity<ErrorResponse> handleForbidden(
            RuntimeException ex, HttpServletRequest req) {
        return build(HttpStatus.FORBIDDEN, ex.getMessage(), req, null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(
            DataIntegrityViolationException ex, HttpServletRequest req) {
        log.warn("Violación de integridad: {}", ex.getMostSpecificCause().getMessage());
        return build(HttpStatus.CONFLICT,
                "No se pudo guardar: violación de integridad (valor duplicado o referencia inválida).",
                req, null);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxSize(
            MaxUploadSizeExceededException ex, HttpServletRequest req) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE,
                "El archivo excede el tamaño máximo permitido de 5 MB.", req, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex, HttpServletRequest req) {
        log.error("Error interno no manejado en {}", req.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR,
                "Error interno del servidor. Intenta nuevamente; si persiste, contacta al administrador.",
                req, null);
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String mensaje,
            HttpServletRequest req, Map<String, String> errors) {
        return ResponseEntity.status(status).body(ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .error(status.getReasonPhrase())
                .message(mensaje)
                .path(req.getRequestURI())
                .validationErrors(errors)
                .build());
    }
}
