package com.alquilaya.serviciousuarios.exceptions;

public class EnvioOtpFallidoException extends RuntimeException {
    public EnvioOtpFallidoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
