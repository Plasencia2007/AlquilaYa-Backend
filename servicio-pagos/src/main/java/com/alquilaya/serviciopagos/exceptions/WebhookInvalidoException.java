package com.alquilaya.serviciopagos.exceptions;

public class WebhookInvalidoException extends RuntimeException {
    public WebhookInvalidoException(String mensaje) {
        super(mensaje);
    }
}
