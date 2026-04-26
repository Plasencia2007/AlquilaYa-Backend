package com.plasencia.servicio_mensajeria.enums;

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
    SISTEMA
}
