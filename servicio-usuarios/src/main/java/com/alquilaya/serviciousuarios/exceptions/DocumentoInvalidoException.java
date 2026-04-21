package com.alquilaya.serviciousuarios.exceptions;

public class DocumentoInvalidoException extends RuntimeException {

    public DocumentoInvalidoException(String mensaje) {
        super(mensaje);
    }

    public DocumentoInvalidoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
