package com.alquilaya.serviciousuarios.exceptions;

public class EmailNoVerificadoException extends RuntimeException {

    public EmailNoVerificadoException(String mensaje) {
        super(mensaje);
    }

    public EmailNoVerificadoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
