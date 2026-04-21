package com.alquilaya.serviciousuarios.exceptions;

public class TelefonoNoVerificadoException extends RuntimeException {

    public TelefonoNoVerificadoException(String mensaje) {
        super(mensaje);
    }

    public TelefonoNoVerificadoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
