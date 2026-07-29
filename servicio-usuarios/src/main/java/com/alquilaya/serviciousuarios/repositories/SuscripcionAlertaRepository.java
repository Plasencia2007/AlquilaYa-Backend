package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.SuscripcionAlerta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface SuscripcionAlertaRepository extends JpaRepository<SuscripcionAlerta, Long> {

    Optional<SuscripcionAlerta> findByTokenBaja(String tokenBaja);

    Optional<SuscripcionAlerta> findByTokenConfirmacion(String tokenConfirmacion);

    /** Todas las suscripciones (activas o no) de un correo — usado para la idempotencia del alta. */
    List<SuscripcionAlerta> findByCorreoIgnoreCase(String correo);

    /**
     * Suscripciones que deben notificarse ante una propiedad aprobada (filtra los criterios
     * <b>escalares</b>; el filtro de {@code servicios} — subset ⊆ — se aplica en Java, ver
     * {@code SuscripcionAlertaService#notificarPropiedadAprobada}).
     *
     * <p>Una suscripción encaja si está viva ({@code activo}) y confirmada y, para cada criterio
     * que tenga fijado, la propiedad lo cumple:</p>
     * <ul>
     *   <li>zona / universidad: coinciden (o la suscripción no filtra por ese campo);</li>
     *   <li>{@code precioMax}: el precio de la propiedad no lo supera (o no hay tope);</li>
     *   <li>{@code tipoPropiedad}: igual al de la propiedad (o no filtra por tipo);</li>
     *   <li>{@code dormitoriosMin} / {@code capacidadMin}: la propiedad cumple el mínimo
     *       ({@code propiedad >= minimo}), o la suscripción no exige mínimo.</li>
     * </ul>
     *
     * <p><b>Datos ausentes en el evento (criterio conservador):</b> los parámetros de la propiedad
     * pueden llegar {@code null} (propiedad legacy sin zona resuelta, o el evento no trae el dato).
     * La lógica ternaria de SQL lo resuelve de forma conservadora sin código extra: si la
     * suscripción <i>sí</i> filtra por un campo pero el evento no trae el dato, la comparación
     * ({@code = null} / {@code null >= s.minimo}) evalúa a UNKNOWN → la fila se descarta. Es decir,
     * solo encajan las suscripciones que <i>no</i> filtran por ese campo (gracias a los
     * {@code IS NULL} explícitos). No se envían alertas que quizá no cumplan el criterio.</p>
     *
     * <p><b>N+1:</b> se hace {@code LEFT JOIN FETCH s.servicios} (con {@code DISTINCT}) para traer
     * la colección de servicios de cada candidata en la misma query y poder comprobar el subset en
     * Java sin disparar una consulta por suscripción.</p>
     */
    @Query("""
            SELECT DISTINCT s FROM SuscripcionAlerta s
            LEFT JOIN FETCH s.servicios
            WHERE s.activo = true AND s.confirmada = true
              AND (s.zonaId IS NULL OR s.zonaId = :zonaId)
              AND (s.universidadId IS NULL OR s.universidadId = :universidadId)
              AND (s.precioMax IS NULL OR s.precioMax >= :precio)
              AND (s.tipoPropiedad IS NULL OR s.tipoPropiedad = :tipoPropiedad)
              AND (s.dormitoriosMin IS NULL OR :dormitorios >= s.dormitoriosMin)
              AND (s.capacidadMin IS NULL OR :capacidad >= s.capacidadMin)
            """)
    List<SuscripcionAlerta> findCoincidencias(@Param("zonaId") Long zonaId,
                                              @Param("universidadId") Long universidadId,
                                              @Param("precio") BigDecimal precio,
                                              @Param("tipoPropiedad") String tipoPropiedad,
                                              @Param("dormitorios") Integer dormitorios,
                                              @Param("capacidad") Integer capacidad);
}
