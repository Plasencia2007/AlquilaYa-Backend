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
            ORDER BY p.fechaCreacion DESC, p.id DESC
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

    /**
     * P5: misma búsqueda que {@link #buscar}, paginada de verdad (Spring Data genera la
     * query COUNT automáticamente a partir de esta misma JPQL). NO reemplaza `/buscar`
     * (que sigue devolviendo el array plano cacheado que ya consume el frontend) — es un
     * endpoint nuevo y aditivo para cuando el volumen de propiedades lo justifique.
     */
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
            ORDER BY p.fechaCreacion DESC, p.id DESC
            """)
    org.springframework.data.domain.Page<Propiedad> buscarPaginado(
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
            @Param("dormitoriosMin") Integer dormitoriosMin,
            org.springframework.data.domain.Pageable pageable
    );

    /**
     * Búsqueda geoespacial "cerca de mí" (G6): propiedades aprobadas dentro de un radio
     * (km) de un punto (lat/lng), ordenadas por distancia ascendente.
     *
     * <p>Patrón estándar en dos fases sobre SQL nativo (sin PostGIS):
     * <ol>
     *   <li><b>Pre-filtro por bounding box</b> ({@code latitud/longitud BETWEEN ...}) — barato
     *       y usa el índice {@code idx_propiedades_latlng} (ver migración V2).</li>
     *   <li><b>Refinado exacto por Haversine</b> ({@code 6371 * acos(...)} en km) tanto en el
     *       {@code WHERE ... <= :radioKm} como en el {@code ORDER BY}.</li>
     * </ol>
     * El argumento de {@code acos} se clampa a [-1,1] con {@code least/greatest} para evitar
     * {@code NaN} por error de punto flotante. Los límites del box los calcula el service.
     *
     * <p>Los filtros opcionales van con {@code CAST(:param AS tipo)} para que PostgreSQL
     * pueda planificar el parámetro nulo (evita "could not determine data type of parameter").
     * Devuelve entidades ({@code SELECT p.*}); el service calcula la distancia en km para el DTO.
     */
    @Query(value = """
            SELECT p.* FROM propiedades p
            WHERE p.aprobado_por_admin = true
              AND p.latitud IS NOT NULL AND p.longitud IS NOT NULL
              AND (:soloDisponibles = false OR p.esta_disponible = true)
              AND p.latitud BETWEEN :latMin AND :latMax
              AND p.longitud BETWEEN :lngMin AND :lngMax
              AND (CAST(:tipo AS text) IS NULL OR p.tipo_propiedad = CAST(:tipo AS text))
              AND (CAST(:periodo AS text) IS NULL OR p.periodo_alquiler = CAST(:periodo AS text))
              AND (CAST(:precioMin AS numeric) IS NULL OR p.precio >= CAST(:precioMin AS numeric))
              AND (CAST(:precioMax AS numeric) IS NULL OR p.precio <= CAST(:precioMax AS numeric))
              AND (CAST(:universidadId AS bigint) IS NULL OR p.universidad_id = CAST(:universidadId AS bigint))
              AND (CAST(:zonaId AS bigint) IS NULL OR p.zona_id = CAST(:zonaId AS bigint))
              AND (CAST(:capacidadMin AS integer) IS NULL
                   OR (p.capacidad_personas IS NOT NULL AND p.capacidad_personas >= CAST(:capacidadMin AS integer)))
              AND (CAST(:dormitoriosMin AS integer) IS NULL
                   OR (p.num_dormitorios IS NOT NULL AND p.num_dormitorios >= CAST(:dormitoriosMin AS integer)))
              AND (6371 * acos( least(1.0, greatest(-1.0,
                    cos(radians(:lat)) * cos(radians(p.latitud)) * cos(radians(p.longitud) - radians(:lng))
                    + sin(radians(:lat)) * sin(radians(p.latitud))
                 )))) <= :radioKm
            ORDER BY (6371 * acos( least(1.0, greatest(-1.0,
                    cos(radians(:lat)) * cos(radians(p.latitud)) * cos(radians(p.longitud) - radians(:lng))
                    + sin(radians(:lat)) * sin(radians(p.latitud))
                 )))) ASC, p.id ASC
            """, nativeQuery = true)
    List<Propiedad> buscarCerca(
            @Param("lat") double lat,
            @Param("lng") double lng,
            @Param("radioKm") double radioKm,
            @Param("latMin") double latMin,
            @Param("latMax") double latMax,
            @Param("lngMin") double lngMin,
            @Param("lngMax") double lngMax,
            @Param("soloDisponibles") boolean soloDisponibles,
            @Param("tipo") String tipo,
            @Param("periodo") String periodo,
            @Param("precioMin") BigDecimal precioMin,
            @Param("precioMax") BigDecimal precioMax,
            @Param("universidadId") Long universidadId,
            @Param("zonaId") Long zonaId,
            @Param("capacidadMin") Integer capacidadMin,
            @Param("dormitoriosMin") Integer dormitoriosMin
    );
}
