package com.plasencia.servicio_mensajeria.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AccionModeracionRequest {

    @Size(max = 500, message = "El motivo no puede superar 500 caracteres")
    private String motivo;
}
