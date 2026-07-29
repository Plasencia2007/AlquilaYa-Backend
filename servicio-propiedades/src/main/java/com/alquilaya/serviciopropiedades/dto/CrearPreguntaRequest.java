package com.alquilaya.serviciopropiedades.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CrearPreguntaRequest {

    @NotBlank(message = "La pregunta es obligatoria")
    @Size(max = 500, message = "La pregunta no puede exceder 500 caracteres")
    private String pregunta;
}
