package com.alquilaya.serviciopropiedades.dto;

import com.alquilaya.serviciopropiedades.enums.EstadoHabitacion;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

/** Alta/edición de una habitación. {@code estado} opcional (por defecto LIBRE). */
@Data
public class HabitacionRequest {

    @NotBlank(message = "El nombre de la habitación es obligatorio")
    @Size(max = 100, message = "El nombre no puede superar 100 caracteres")
    private String nombre;

    @NotNull(message = "El precio es obligatorio")
    @DecimalMin(value = "0.01", message = "El precio debe ser mayor a 0")
    private BigDecimal precio;

    private EstadoHabitacion estado;
    private Double area;

    @Size(max = 1000, message = "La descripción no puede superar 1000 caracteres")
    private String descripcion;

    private Integer orden;
}
