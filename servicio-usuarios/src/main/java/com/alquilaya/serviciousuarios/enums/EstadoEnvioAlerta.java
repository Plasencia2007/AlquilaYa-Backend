package com.alquilaya.serviciousuarios.enums;

/**
 * Estado de una fila de la cola de reintentos de alertas por correo
 * ({@code envios_alerta}). Ver {@link com.alquilaya.serviciousuarios.entities.EnvioAlerta}.
 */
public enum EstadoEnvioAlerta {
    /** Encolada, pendiente de envío (o de reintento tras un fallo). El scheduler la drena. */
    PENDIENTE,
    /** El correo SMTP se envió con éxito real. Estado terminal. */
    ENVIADO,
    /** Se agotaron los reintentos (DLQ lógico). Estado terminal; requiere revisión manual. */
    FALLIDO
}
