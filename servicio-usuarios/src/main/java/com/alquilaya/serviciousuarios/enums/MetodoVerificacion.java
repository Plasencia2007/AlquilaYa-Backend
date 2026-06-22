package com.alquilaya.serviciousuarios.enums;

/**
 * Método de verificación obligatorio para iniciar sesión, elegible por el admin (#3).
 * - EMAIL: el usuario debe verificar su correo (link de Gmail).
 * - WHATSAPP_OTP: código por WhatsApp (comportamiento histórico).
 * - AMBOS: correo y teléfono.
 * - NINGUNO: sin verificación (acceso libre).
 */
public enum MetodoVerificacion {
    EMAIL,
    WHATSAPP_OTP,
    AMBOS,
    NINGUNO;

    public boolean requiereEmail() {
        return this == EMAIL || this == AMBOS;
    }

    public boolean requiereTelefono() {
        return this == WHATSAPP_OTP || this == AMBOS;
    }
}
