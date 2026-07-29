package com.alquilaya.serviciousuarios.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Map;

/**
 * Un evento individual dentro del batch de {@link RegistrarEventosAnalyticsRequest} (ítem 455).
 *
 * <p>{@code props} es forma libre a propósito -- cada tipo de evento define las suyas en el
 * frontend ({@code src/lib/analytics.ts}); el tamaño serializado se valida en
 * {@code EventoAnalyticsService} (máx. 4KB, anti-abuso).</p>
 */
@Data
public class EventoAnalyticsItemDTO {

    @NotBlank(message = "El nombre del evento es obligatorio")
    @Size(max = 150, message = "El nombre del evento es demasiado largo")
    private String evento;

    /** Payload libre del evento. Forma no tipada a propósito. */
    private Map<String, Object> props;

    /** Id de sesión anónima de navegador (sessionStorage). Opcional. */
    @Size(max = 100, message = "sessionId inválido")
    private String sessionId;

    /** epoch ms del evento en el cliente. Informativo: el servidor usa su propio reloj para fechaCreacion. */
    private Long timestamp;
}
