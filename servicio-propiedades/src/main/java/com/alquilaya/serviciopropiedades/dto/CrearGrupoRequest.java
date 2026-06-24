package com.alquilaya.serviciopropiedades.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Crear un grupo de roommates para una propiedad (#38 Fase 1b). */
@Data
public class CrearGrupoRequest {
    @NotNull(message = "La propiedad es obligatoria")
    private Long propiedadId;
    private String nombre;
    private String descripcion;
    /** Cupos totales (incluye al creador). Si es null, se usa la capacidad de la propiedad. */
    private Integer cuposTotales;
}
