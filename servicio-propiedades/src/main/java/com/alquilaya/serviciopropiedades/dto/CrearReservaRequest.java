package com.alquilaya.serviciopropiedades.dto;

import com.alquilaya.serviciopropiedades.validaciones.anotaciones.RangoFechasValido;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
@RangoFechasValido
public class CrearReservaRequest {

    @NotNull(message = "La propiedad es obligatoria")
    private Long propiedadId;

    @NotNull(message = "La fecha de inicio es obligatoria")
    @FutureOrPresent(message = "La fecha de inicio no puede ser anterior a hoy")
    private LocalDate fechaInicio;

    @NotNull(message = "La fecha de fin es obligatoria")
    private LocalDate fechaFin;
}
