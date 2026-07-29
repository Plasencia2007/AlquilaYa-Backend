package com.alquilaya.serviciopagos.exceptions;

/** Ítem 280: el pago/reserva del comprobante solicitado no pertenece al usuario autenticado. */
public class ComprobanteAccesoDenegadoException extends RuntimeException {
    public ComprobanteAccesoDenegadoException(String mensaje) {
        super(mensaje);
    }
}
