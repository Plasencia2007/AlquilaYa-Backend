package com.alquilaya.serviciousuarios.exceptions;

public class TelefonoYaRegistradoException extends RuntimeException {

    public TelefonoYaRegistradoException(String mensaje) {
        super(mensaje);
    }

    public TelefonoYaRegistradoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
