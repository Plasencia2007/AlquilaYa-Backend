package com.alquilaya.servicio_mensajeria.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Respuesta de servicio-usuarios: GET /api/v1/usuarios/{id}/preferencias-notificacion.
 * Usado por {@link com.alquilaya.servicio_mensajeria.services.NotificacionService} para
 * filtrar el envío según la preferencia del destinatario (ítem 210). Los defaults en `true`
 * hacen que, si Jackson deserializa un objeto vacío (no debería pasar, pero por si acaso),
 * el comportamiento sea fail-open igual que en {@code UsuariosClientFallback}.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PreferenciasNotificacionDTO {
    private boolean notificarMensajes = true;
    private boolean notificarReservas = true;
    private boolean notificarMarketing = true;
}
