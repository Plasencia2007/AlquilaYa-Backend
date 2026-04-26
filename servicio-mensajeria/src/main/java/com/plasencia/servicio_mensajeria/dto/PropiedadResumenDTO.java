package com.plasencia.servicio_mensajeria.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Respuesta flexible de servicio-propiedades: /api/v1/propiedades/{id}/publico
 * Solo tomamos id y titulo para mostrarlos en la UI del chat.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PropiedadResumenDTO {
    private Long id;
    private String titulo;
}
