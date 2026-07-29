package com.alquilaya.serviciousuarios.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Preferencias de notificación del usuario (ítem 210). Se usa tanto para el endpoint de
 * perfil propio ({@code GET/PUT /perfil/preferencias-notificacion}) como para la variante
 * S2S sin PII ({@code GET /{id}/preferencias-notificacion}) que consume servicio-mensajeria
 * para filtrar el envío antes de crear+pushear cada notificación.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PreferenciasNotificacionResponse {
    private boolean notificarMensajes;
    private boolean notificarReservas;
    private boolean notificarMarketing;
}
