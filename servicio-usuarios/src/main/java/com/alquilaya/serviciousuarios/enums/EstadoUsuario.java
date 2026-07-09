package com.alquilaya.serviciousuarios.enums;

public enum EstadoUsuario {
    /** Registrado pero aún sin verificar (teléfono/email). No cuenta como habilitado. */
    PENDING,
    /** Cuenta activa y habilitada para iniciar sesión. */
    ACTIVE,
    /** Baneado permanentemente por un admin. No puede iniciar sesión. */
    BANNED,
    /** Registro/KYC rechazado por un admin (p. ej. documentos falsos). No puede iniciar sesión. */
    REJECTED,
    /** Suspensión temporal por un admin. No puede iniciar sesión hasta que se reactive. */
    SUSPENDED;

    /**
     * Estados que impiden iniciar sesión (baneado, rechazado o suspendido).
     * PENDING no bloquea aquí: su acceso lo gobiernan los gates de verificación de teléfono/email.
     */
    public boolean bloqueaAcceso() {
        return this == BANNED || this == REJECTED || this == SUSPENDED;
    }
}
