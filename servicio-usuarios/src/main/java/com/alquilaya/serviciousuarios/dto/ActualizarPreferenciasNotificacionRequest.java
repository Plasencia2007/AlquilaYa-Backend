package com.alquilaya.serviciousuarios.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Body de PUT /perfil/preferencias-notificacion (ítem 210). */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ActualizarPreferenciasNotificacionRequest {
    private boolean notificarMensajes;
    private boolean notificarReservas;
    private boolean notificarMarketing;
}
