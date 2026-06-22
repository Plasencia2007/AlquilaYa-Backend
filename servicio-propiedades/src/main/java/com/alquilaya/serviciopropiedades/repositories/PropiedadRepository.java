package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface PropiedadRepository extends JpaRepository<Propiedad, Long> {
    List<Propiedad> findByArrendadorId(Long arrendadorId);

    List<Propiedad> findByArrendadorIdAndEstado(Long arrendadorId, EstadoPropiedad estado);

    List<Propiedad> findByArrendadorIdAndEstadoNot(Long arrendadorId, EstadoPropiedad estado);

    /** Borradores programados cuya fecha de publicación ya venció (para el scheduler). */
    List<Propiedad> findByEstadoAndFechaPublicacionProgramadaLessThanEqual(
            EstadoPropiedad estado, java.time.LocalDateTime momento);

    /** Avisos aprobados sin reconfirmar desde antes de {@code limite} y aún sin marcar (#49). */
    @Query("""
            SELECT p FROM Propiedad p
            WHERE p.estado = :estado AND p.aprobadoPorAdmin = true
              AND p.requiereReconfirmacion = false
              AND p.fechaUltimaConfirmacion IS NOT NULL
              AND p.fechaUltimaConfirmacion < :limite
            """)
    List<Propiedad> findCaducados(@Param("estado") EstadoPropiedad estado,
                                  @Param("limite") java.time.LocalDateTime limite);

    List<Propiedad> findByEstadoOrderByFechaCreacionAsc(EstadoPropiedad estado);

    // Lock pesimista para serializar creaciones de reserva concurrentes sobre la misma propiedad.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Propiedad p WHERE p.id = :id")
    Optional<Propiedad> findByIdForUpdate(@Param("id") Long id);

    /**
     * Incremento atómico del contador de vistas. Se invoca de forma asíncrona
     * desde el endpoint de detalle para no penalizar la latencia del GET.
     */
    @Modifying
    @Transactional
    @Query("UPDATE Propiedad p SET p.vistas = COALESCE(p.vistas, 0) + 1 WHERE p.id = :id")
    int incrementarVistas(@Param("id") Long id);

    /**
     * Candidatos para "propiedades similares": aprobadas, disponibles, distintas de la
     * actual y (si se conoce) de la misma universidad. El ranking fino se hace en el service.
     */
    @Query("""
            SELECT p FROM Propiedad p
            WHERE p.id <> :id
              AND p.aprobadoPorAdmin = true
              AND p.estaDisponible = true
              AND (:universidadId IS NULL OR p.universidadId = :universidadId)
            """)
    List<Propiedad> candidatosSimilares(@Param("id") Long id, @Param("universidadId") Long universidadId);

    /**
     * Estadísticas de precio (min, promedio, max, conteo) de avisos aprobados+disponibles que
     * matcheen zona/universidad/tipo (cada filtro opcional). Para el "precio sugerido al publicar".
     */
    @Query("""
            SELECT MIN(p.precio), AVG(p.precio), MAX(p.precio), COUNT(p) FROM Propiedad p
            WHERE p.aprobadoPorAdmin = true AND p.estaDisponible = true
              AND (:zonaId IS NULL OR p.zonaId = :zonaId)
              AND (:universidadId IS NULL OR p.universidadId = :universidadId)
              AND (:tipo IS NULL OR p.tipoPropiedad = :tipo)
            """)
    List<Object[]> estadisticasPrecio(@Param("zonaId") Long zonaId,
                                      @Param("universidadId") Long universidadId,
                                      @Param("tipo") String tipo);

    @Query("""
            SELECT DISTINCT p FROM Propiedad p
            LEFT JOIN p.serviciosIncluidos s
            WHERE p.aprobadoPorAdmin = true
              AND (:precioMin IS NULL OR p.precio >= :precioMin)
              AND (:precioMax IS NULL OR p.precio <= :precioMax)
              AND (:tipo IS NULL OR p.tipoPropiedad = :tipo)
              AND (:periodo IS NULL OR p.periodoAlquiler = :periodo)
              AND (:disponible IS NULL OR p.estaDisponible = :disponible)
              AND (:distanciaMax IS NULL OR p.distanciaMetros IS NULL OR p.distanciaMetros <= :distanciaMax)
              AND (:servicios IS NULL OR s IN :servicios)
              AND (:zona IS NULL OR LOWER(p.direccion) LIKE :zona)
              AND (:universidadId IS NULL OR p.universidadId = :universidadId)
              AND (:zonaId IS NULL OR p.zonaId = :zonaId)
              AND (:capacidadMin IS NULL OR (p.capacidadPersonas IS NOT NULL AND p.capacidadPersonas >= :capacidadMin))
              AND (:dormitoriosMin IS NULL OR (p.numDormitorios IS NOT NULL AND p.numDormitorios >= :dormitoriosMin))
            """)
    List<Propiedad> buscar(
            @Param("precioMin") BigDecimal precioMin,
            @Param("precioMax") BigDecimal precioMax,
            @Param("tipo") String tipo,
            @Param("periodo") String periodo,
            @Param("disponible") Boolean disponible,
            @Param("distanciaMax") Integer distanciaMax,
            @Param("servicios") List<String> servicios,
            @Param("zona") String zona,
            @Param("universidadId") Long universidadId,
            @Param("zonaId") Long zonaId,
            @Param("capacidadMin") Integer capacidadMin,
            @Param("dormitoriosMin") Integer dormitoriosMin
    );
}
