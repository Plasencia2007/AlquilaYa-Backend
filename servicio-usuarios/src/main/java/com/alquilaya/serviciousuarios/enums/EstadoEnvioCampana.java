package com.alquilaya.serviciousuarios.enums;

/** Estado de envío de una campaña de WhatsApp (ítem 381). */
public enum EstadoEnvioCampana {
    /** Creada, aún no enviada (esperando su `programadoPara`). */
    PENDIENTE,
    /** Ya se encolaron los eventos individuales a Kafka para todos los destinatarios resueltos. */
    ENVIADA,
    /** La resolución/encolado falló y no se pudo reintentar automáticamente. */
    ERROR
}
