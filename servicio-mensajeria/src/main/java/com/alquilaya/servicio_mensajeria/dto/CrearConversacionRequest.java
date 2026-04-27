package com.alquilaya.servicio_mensajeria.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class CrearConversacionRequest {

    /**
     * Id de la contraparte (si el caller es ESTUDIANTE, es el arrendadorId; si es ARRENDADOR,
     * es el estudianteId). El servicio decide cuál es según el rol del caller.
     */
    @NotNull(message = "La contraparte es obligatoria")
    @Positive(message = "contraparteId debe ser positivo")
    private Long contraparteId;

    @NotNull(message = "propiedadId es obligatorio")
    @Positive(message = "propiedadId debe ser positivo")
    private Long propiedadId;
}
