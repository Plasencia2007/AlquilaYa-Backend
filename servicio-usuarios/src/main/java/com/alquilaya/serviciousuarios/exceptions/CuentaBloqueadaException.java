package com.alquilaya.serviciousuarios.exceptions;

/**
 * Se lanza cuando una cuenta acumula 5 logins fallidos en 15 minutos.
 * El handler global la mapea a HTTP 423 Locked.
 */
public class CuentaBloqueadaException extends RuntimeException {

    public CuentaBloqueadaException(String mensaje) {
        super(mensaje);
    }
}
