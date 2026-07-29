package com.alquilaya.servicio_mensajeria.enums;

/** Distingue el par de participantes de una conversación. */
public enum TipoConversacion {
    /** Un estudiante y un arrendador, ancladas a una propiedad (flujo original). */
    ESTUDIANTE_ARRENDADOR,
    /** Dos estudiantes (roommates), sin propiedad ni arrendador asociados. */
    ROOMMATE
}
