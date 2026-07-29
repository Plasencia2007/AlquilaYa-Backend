package com.alquilaya.serviciousuarios.exceptions;

/**
 * Se lanza cuando una operación no puede aplicarse al estado actual del recurso
 * (conflicto de estado). El {@link GlobalExceptionHandler} la mapea a 409 Conflict.
 */
public class ConflictoEstadoException extends RuntimeException {

    public ConflictoEstadoException(String mensaje) {
        super(mensaje);
    }
}
