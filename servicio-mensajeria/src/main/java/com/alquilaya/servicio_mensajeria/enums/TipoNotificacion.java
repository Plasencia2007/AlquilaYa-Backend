package com.alquilaya.servicio_mensajeria.enums;

/**
 * Catálogo de eventos que generan una notificación in-app para el usuario.
 * Los textos por defecto se construyen en el servicio según este tipo.
 */
public enum TipoNotificacion {
    RESERVA_APROBADA,
    RESERVA_RECHAZADA,
    RESERVA_PAGADA,
    RESERVA_CANCELADA,
    MENSAJE_NUEVO,
    DOCUMENTO_APROBADO,
    DOCUMENTO_RECHAZADO,
    BIENVENIDA,
    RECORDATORIO_PAGO,
    ALERTA_ZONA,
    SISTEMA,
    /** Ítem 378 (admin): un usuario subió un documento KYC nuevo, pendiente de revisión. */
    DOCUMENTO_NUEVO,
    /** Notif admin (gap #2/3): una denuncia nueva sobre una propiedad, pendiente de revisión. */
    DENUNCIA_NUEVA,
    /** Notif admin (gap #2/3): una propiedad nueva (o reenviada tras rechazo) quedó PENDIENTE de revisión. */
    PROPIEDAD_PENDIENTE
}
