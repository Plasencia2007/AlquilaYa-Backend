package com.alquilaya.serviciopropiedades.enums;

/** Motivo de una denuncia de publicación. */
public enum MotivoDenuncia {
    FRAUDE,            // parece estafa / pide adelantos raros
    INFO_FALSA,        // datos/fotos no coinciden con la realidad
    DUPLICADO,         // aviso repetido
    CONTACTO_EXTERNO,  // intenta sacar el trato fuera de la plataforma
    INAPROPIADO,       // contenido ofensivo
    OTRO
}
