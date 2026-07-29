package com.alquilaya.serviciousuarios.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Datos que viajan en el evento {@code PROPIEDAD_APROBADA} (topic {@code propiedades-topic})
 * y que el consumidor de alertas ({@code PropiedadEventListener}) necesita para matchear
 * suscripciones y redactar el correo.
 *
 * <p>Los campos {@code servicios}, {@code dormitorios} y {@code capacidad} enriquecen el matching
 * (criterios ampliados de la suscripción). Pueden llegar {@code null}/ausentes si el productor
 * (servicio-propiedades) aún no los emite o la propiedad no tiene el dato; el matching lo tolera y
 * los trata como "no verificable" de forma conservadora (ver {@code SuscripcionAlertaRepository}).</p>
 */
public record PropiedadAprobadaEventDTO(
        Long propiedadId,
        String titulo,
        BigDecimal precio,
        Long zonaId,
        Long universidadId,
        String tipoPropiedad,
        String ubicacion,
        List<String> servicios,
        Integer dormitorios,
        Integer capacidad
) {}
