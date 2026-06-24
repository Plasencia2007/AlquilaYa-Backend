package com.alquilaya.serviciopropiedades.enums;

/** Estado de un miembro dentro de un grupo de roommates (#38 Fase 1b). */
public enum EstadoMiembro {
    /** Creó el grupo. */
    CREADOR,
    /** Miembro confirmado (entró por link o fue aprobado). */
    UNIDO,
    /** Pidió unirse a un grupo abierto; espera aprobación del creador. */
    SOLICITADO
}
