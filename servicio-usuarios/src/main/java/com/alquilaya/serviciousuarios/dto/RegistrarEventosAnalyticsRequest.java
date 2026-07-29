package com.alquilaya.serviciousuarios.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * Batch de eventos de analítica CLIENTE (ítem 455) enviado desde {@code src/lib/analytics.ts}.
 * Público y anónimo: el frontend acumula eventos y los manda juntos cada cierto intervalo (o al
 * llegar a N eventos) en vez de uno por request -- más eficiente para el sink fire-and-forget.
 *
 * <p>Tamaño del batch acotado (máx. 50) como anti-abuso, junto al tamaño de {@code props} de
 * cada evento (validado en {@code EventoAnalyticsService}) y el rate limit por IP del
 * {@code RateLimitFilter}.</p>
 */
@Data
public class RegistrarEventosAnalyticsRequest {

    @NotEmpty(message = "El batch de eventos no puede estar vacío")
    @Size(max = 50, message = "El batch admite como máximo 50 eventos por request")
    private List<@Valid EventoAnalyticsItemDTO> eventos;
}
