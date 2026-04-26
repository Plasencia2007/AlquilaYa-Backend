package com.alquilaya.serviciopropiedades.enums;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum EstadoReserva {
    SOLICITADA,
    APROBADA,
    RECHAZADA,
    PAGADA,
    FINALIZADA,
    CANCELADA;

    // Transiciones permitidas. Los estados ausentes del mapa son terminales.
    private static final Map<EstadoReserva, Set<EstadoReserva>> TRANSICIONES = Map.of(
            SOLICITADA, EnumSet.of(APROBADA, RECHAZADA, CANCELADA),
            APROBADA,   EnumSet.of(PAGADA, CANCELADA),
            PAGADA,     EnumSet.of(FINALIZADA, CANCELADA),
            RECHAZADA,  EnumSet.noneOf(EstadoReserva.class),
            FINALIZADA, EnumSet.noneOf(EstadoReserva.class),
            CANCELADA,  EnumSet.noneOf(EstadoReserva.class)
    );

    public boolean puedeTransicionarA(EstadoReserva destino) {
        if (destino == null || destino == this) return false;
        return TRANSICIONES.getOrDefault(this, EnumSet.noneOf(EstadoReserva.class)).contains(destino);
    }
}
