package com.alquilaya.serviciopropiedades.dto;

/**
 * Conteo agregado de denuncias por estado (ítem 376). Alimenta la card "Por Revisar" del panel
 * admin, que antes solo se llenaba cuando el filtro activo era PENDIENTE (mostraba "—" el resto
 * del tiempo) — con este endpoint el conteo es siempre real, independiente del filtro actual.
 */
public record DenunciaConteosDTO(
        long pendientes,
        long revisadas,
        long descartadas,
        long total
) {
}
