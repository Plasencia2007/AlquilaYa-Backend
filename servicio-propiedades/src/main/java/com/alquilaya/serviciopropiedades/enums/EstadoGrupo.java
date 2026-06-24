package com.alquilaya.serviciopropiedades.enums;

/** Estado de un grupo de roommates (#38 Fase 1b). */
public enum EstadoGrupo {
    /** Buscando miembros. */
    ABIERTO,
    /** Cupos llenos, listo para reservar (Fase 2). */
    COMPLETO,
    /** Ya generó la reserva grupal (Fase 2). */
    RESERVADO,
    /** Cerrado/cancelado por el creador. */
    CERRADO
}
