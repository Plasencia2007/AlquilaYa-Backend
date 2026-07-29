package com.alquilaya.serviciousuarios.dto;

import java.time.LocalDate;

/**
 * Ítem 386: conteo de registros de usuarios de una semana (el lunes de esa semana ISO),
 * para la gráfica de crecimiento de usuarios del panel admin.
 */
public record RegistroSemanalDTO(LocalDate semana, Long total) {
}
