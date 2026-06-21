package com.alquilaya.servicio_catalogos.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request de creación/edición de una universidad. Las zonas de cobertura viajan embebidas:
 * al crear/actualizar, el servicio reemplaza el conjunto de zonas de la universidad en una
 * sola operación atómica (un único "Guardar").
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UniversidadRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(min = 2, max = 150, message = "El nombre debe tener entre 2 y 150 caracteres")
    private String nombre;

    @Size(max = 500, message = "La descripción no puede superar 500 caracteres")
    private String descripcion;

    @Size(max = 30, message = "El color no puede superar 30 caracteres")
    private String color;

    @DecimalMin(value = "-90.0", message = "La latitud debe estar entre -90 y 90")
    @DecimalMax(value = "90.0", message = "La latitud debe estar entre -90 y 90")
    private Double latitud;

    @DecimalMin(value = "-180.0", message = "La longitud debe estar entre -180 y 180")
    @DecimalMax(value = "180.0", message = "La longitud debe estar entre -180 y 180")
    private Double longitud;

    private Boolean activo;

    /** Marca esta universidad como el campus principal (ancla de cercanía del sistema). */
    private Boolean esPrincipal;

    @Valid
    private List<ZonaCoberturaRequest> zonas;
}
