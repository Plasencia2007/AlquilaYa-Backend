package com.alquilaya.servicio_mensajeria.dto;

import lombok.AllArgsConstructor;
import lombok.Value;

/** Un participante de una conversación, para el panel admin de moderación. */
@Value
@AllArgsConstructor
public class ParticipanteConversacionDTO {
    Long id;
    String nombre;
    /** "ESTUDIANTE" | "ARRENDADOR" */
    String rol;
}
