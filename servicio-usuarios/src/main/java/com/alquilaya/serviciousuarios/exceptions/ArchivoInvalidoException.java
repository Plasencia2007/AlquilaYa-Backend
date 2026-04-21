package com.alquilaya.serviciousuarios.exceptions;

public class ArchivoInvalidoException extends RuntimeException {

    public ArchivoInvalidoException(String mensaje) {
        super(mensaje);
    }

    public ArchivoInvalidoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
