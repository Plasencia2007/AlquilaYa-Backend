package com.alquilaya.servicio_mensajeria.services;

/**
 * Lanzada cuando un usuario excede el cupo de mensajes por minuto.
 * En REST se traduce a HTTP 429 (ver GlobalExceptionHandler).
 * En WebSocket se envía como ERROR frame estructurado al cliente
 * (ver ChatWebSocketController.handleError).
 */
public class RateLimitExceededException extends RuntimeException {
    public RateLimitExceededException(String message) {
        super(message);
    }
}
