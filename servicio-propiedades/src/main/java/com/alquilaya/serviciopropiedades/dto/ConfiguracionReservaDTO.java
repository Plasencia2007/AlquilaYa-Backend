package com.alquilaya.serviciopropiedades.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConfiguracionReservaDTO {

    @NotNull(message = "expiracionHoras es obligatorio")
    @Min(value = 1, message = "El mínimo es 1 hora")
    @Max(value = 720, message = "El máximo es 720 horas (30 días)")
    private Integer expiracionHoras;
}
