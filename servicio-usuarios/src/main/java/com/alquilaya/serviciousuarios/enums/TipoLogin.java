package com.alquilaya.serviciousuarios.enums;

/**
 * Cómo se creó / autentica la cuenta:
 *  - LOCAL: registro con email + contraseña.
 *  - GOOGLE: creada vía Google OAuth (sin contraseña conocida por el usuario).
 */
public enum TipoLogin {
    LOCAL,
    GOOGLE
}
