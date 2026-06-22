package com.alquilaya.serviciopropiedades.dto;

import java.math.BigDecimal;
import java.util.List;

/** Analítica completa de una publicación para el arrendador (#51–#55). */
public record AnaliticaPropiedadDTO(
        List<PuntoSerie> vistasPorDia,   // #51 — serie diaria (últimos 30 días)
        long vistas7,
        long vistas30,
        long vistasTotal,
        Embudo embudo,                   // #52
        PrecioZona precioVsZona,         // #53 (null si no hay comparables)
        List<String> sugerencias,        // #54
        Long diasUltimaReserva,          // #55 — días desde la última reserva (null si nunca)
        boolean alertaSinReservas        // #55
) {
    /** Un punto de la serie temporal: fecha ISO (yyyy-MM-dd) y valor. */
    public record PuntoSerie(String fecha, long valor) {}

    /** Embudo de conversión. */
    public record Embudo(long vistas, long favoritos, long contactos, long reservas) {}

    /** Comparación de precio con la zona. posicion = BAJO | PROMEDIO | ALTO. */
    public record PrecioZona(
            BigDecimal precio,
            BigDecimal promedio,
            BigDecimal min,
            BigDecimal max,
            long cantidad,
            String posicion
    ) {}
}
