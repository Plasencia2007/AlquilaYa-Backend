package com.alquilaya.servicio_mensajeria.repositories.projection;

import com.alquilaya.servicio_mensajeria.enums.RolEmisor;

import java.time.LocalDateTime;

/**
 * Proyección ligera para el cálculo del tiempo de respuesta del arrendador.
 *
 * <p>Sólo trae las 3 columnas que el algoritmo necesita —{@code conversacion_id},
 * {@code emisor_rol} y {@code fecha_envio}— evitando cargar el {@code contenido}
 * (TEXT) de cada mensaje. Así el barrido por arrendador es barato en memoria y red.
 */
public interface MensajeTiempoRespuestaView {

    Long getConversacionId();

    RolEmisor getEmisorRol();

    LocalDateTime getFechaEnvio();
}
