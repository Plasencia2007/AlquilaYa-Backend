package com.alquilaya.serviciousuarios.exceptions;

public class OtpInvalidoException extends RuntimeException {

    public OtpInvalidoException(String mensaje) {
        super(mensaje);
    }

    public OtpInvalidoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
