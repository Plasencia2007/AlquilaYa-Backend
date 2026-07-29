package com.alquilaya.serviciopropiedades.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Estadísticas agregadas de la plataforma para la home (#86). Solo cifras REALES que
 * servicio-propiedades conoce en su propia BD (propiedades, reservas y reseñas). El
 * conteo de estudiantes vive en servicio-usuarios y NO se cruza aquí a propósito.
 */
@Data
@Builder
public class PlataformaStatsDTO {
    /** Propiedades aprobadas por admin (visibles en el catálogo público). */
    private long propiedadesActivas;
    /** Reservas que completaron su ciclo (estado FINALIZADA). */
    private long reservasCompletadas;
    /** Reseñas de propiedad visibles. */
    private long totalResenas;
    /** Promedio de calificación (1-5) redondeado a 1 decimal; null si aún no hay reseñas. */
    private Double calificacionPromedio;
}
