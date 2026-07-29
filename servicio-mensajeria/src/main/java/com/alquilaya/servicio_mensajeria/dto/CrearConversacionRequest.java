package com.alquilaya.servicio_mensajeria.dto;

import com.alquilaya.servicio_mensajeria.enums.TipoConversacion;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class CrearConversacionRequest {

    /**
     * Id de la contraparte. En ESTUDIANTE_ARRENDADOR: si el caller es ESTUDIANTE, es el
     * arrendadorId; si es ARRENDADOR, es el estudianteId. En ROOMMATE, es el estudianteId
     * del otro estudiante.
     */
    @NotNull(message = "La contraparte es obligatoria")
    @Positive(message = "contraparteId debe ser positivo")
    private Long contraparteId;

    /**
     * Obligatorio solo en ESTUDIANTE_ARRENDADOR (ancla la conversación a una propiedad);
     * se ignora en ROOMMATE. No lleva @NotNull porque su obligatoriedad depende de
     * {@link #tipo} — se valida en el service.
     */
    @Positive(message = "propiedadId debe ser positivo")
    private Long propiedadId;

    /** ESTUDIANTE_ARRENDADOR (default, compatibilidad con clientes existentes) o ROOMMATE. */
    private TipoConversacion tipo = TipoConversacion.ESTUDIANTE_ARRENDADOR;
}
