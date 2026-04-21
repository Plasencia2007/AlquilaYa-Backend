package com.alquilaya.serviciousuarios.exceptions;

public class CorreoYaRegistradoException extends RuntimeException {

    public CorreoYaRegistradoException(String mensaje) {
        super(mensaje);
    }

    public CorreoYaRegistradoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
