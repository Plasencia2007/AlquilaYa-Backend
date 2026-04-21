package com.alquilaya.serviciousuarios.exceptions;

public class AccesoDenegadoException extends RuntimeException {

    public AccesoDenegadoException(String mensaje) {
        super(mensaje);
    }

    public AccesoDenegadoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
