package com.alquilaya.serviciopropiedades.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

/** Datos para generar la reserva grupal (#38 Fase 2). */
@Data
public class ReservarGrupoRequest {
    @NotNull(message = "La fecha de inicio es obligatoria")
    private LocalDate fechaInicio;
    @NotNull(message = "La fecha de fin es obligatoria")
    private LocalDate fechaFin;
}
