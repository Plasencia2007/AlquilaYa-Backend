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

    /**
     * Ids distintos de arrendadores con al menos una propiedad publicada y visible — el
     * universo acotado sobre el que se resuelve "solo verificados" (ítem 125): se consulta
     * contra servicio-usuarios (única fuente de verdad de {@code Arrendador.verificado})
     * en vez de denormalizar el flag aquí, así nunca queda desactualizado.
     */
    @Query("""
            SELECT DISTINCT p.arrendadorId FROM Propiedad p
            WHERE p.aprobadoPorAdmin = true AND p.estaDisponible = true
            """)
    List<Long> arrendadorIdsActivos();

    /**
     * Full-text search real (ítem 491): usa el {@code tsvector} generado + índice GIN
     * (ver migración V5) en vez del {@code LIKE} pragmático anterior (full scan). Devuelve
     * ids ordenados por relevancia ({@code ts_rank}), acotados a un tope generoso — se usan
     * como filtro {@code p.id IN (:ids)} en {@link #buscar} / {@link #buscarPaginado} (JPQL),
     * sin tocar su {@code Sort}/paginación dinámica (mezclar {@code Sort} con queries nativas
     * no es seguro en Spring Data JPA). Solo propiedades aprobadas.
     */
    @Query(value = """
            SELECT p.id FROM propiedades p
            WHERE p.aprobado_por_admin = true
              AND p.busqueda_tsv @@ plainto_tsquery('spanish', :q)
            ORDER BY ts_rank(p.busqueda_tsv, plainto_tsquery('spanish', :q)) DESC
            LIMIT :limite
            """, nativeQuery = true)
    List<Long> idsPorTextoLibre(@Param("q") String q, @Param("limite") int limite);

    /** Propiedades aprobadas por admin (visibles en el catálogo público) — headline de escala (#86). */
    long countByAprobadoPorAdminTrue();

    /**
     * Conteo de avisos por zona con el precio más bajo de cada una, para la sección "Zonas
     * destacadas" de la home. Aplica EXACTAMENTE el mismo criterio de "publicada y visible"
     * que la búsqueda pública {@code /buscar}: {@code aprobadoPorAdmin = true} (excluye
     * borradores/pendientes) + {@code estaDisponible = true} (lo que la búsqueda usa por
     * defecto). Excluye {@code zonaId = null} (avisos sin zona resuelta). Es una agregación
     * en BD ({@code COUNT}/{@code MIN} + {@code GROUP BY}) que devuelve un DTO vía constructor
     * expression — NO carga entidades ni el catálogo completo.
     */
    @Query("""
            SELECT new com.alquilaya.serviciopropiedades.dto.ConteoZonaDTO(
                       p.zonaId, COUNT(p), MIN(p.precio))
            FROM Propiedad p
            WHERE p.aprobadoPorAdmin = true
              AND p.estaDisponible = true
              AND p.zonaId IS NOT NULL
            GROUP BY p.zonaId
            """)
    List<com.alquilaya.serviciopropiedades.dto.ConteoZonaDTO> conteoPorZona();

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

    /**
     * Ítem 389: TODAS las propiedades sometidas a moderación (cualquier estado excepto
     * {@code BORRADOR}, que son avisos sin publicar que el arrendador aún está editando y no
     * corresponde mostrar en el mapa admin) — alimenta {@code GET /admin/propiedades} sin filtro,
     * para el mapa de calor por estado del panel admin.
     */
    List<Propiedad> findByEstadoNotOrderByFechaCreacionAsc(EstadoPropiedad estado);

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
              AND (:calificacionMin IS NULL OR (p.calificacion IS NOT NULL AND p.calificacion >= :calificacionMin))
              AND (:qIds IS NULL OR p.id IN :qIds)
              AND (:soloConFotos IS NULL OR SIZE(p.imagenes) > 0 OR p.imagenUrl IS NOT NULL)
              AND (:arrendadoresVerificados IS NULL OR p.arrendadorId IN :arrendadoresVerificados)
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
            @Param("dormitoriosMin") Integer dormitoriosMin,
            @Param("calificacionMin") Double calificacionMin,
            @Param("qIds") List<Long> qIds,
            @Param("soloConFotos") Boolean soloConFotos,
            @Param("arrendadoresVerificados") List<Long> arrendadoresVerificados
    );

    /**
     * P5: misma búsqueda que {@link #buscar}, paginada de verdad (Spring Data genera la
     * query COUNT automáticamente a partir de esta misma JPQL). NO reemplaza `/buscar`
     * (que sigue devolviendo el array plano cacheado que ya consume el frontend) — es un
     * endpoint nuevo y aditivo para cuando el volumen de propiedades lo justifique.
     *
     * <p>El orden NO va fijo en la JPQL: lo aporta el {@code Sort} del {@link org.springframework.data.domain.Pageable}
     * (lo arma el service según el parámetro {@code orden}: precio asc/desc, recientes, calificación).
     * Como el {@code SELECT DISTINCT p} proyecta todas las columnas de {@code p}, PostgreSQL admite
     * ordenar por cualquiera de ellas (precio/fechaCreacion/calificacion) aun con DISTINCT. El
     * orden "distancia al campus" NO se resuelve aquí (es un cálculo Haversine cliente sobre
     * coordenadas, no una columna directa) — se mantiene en el cliente.
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
              AND (:calificacionMin IS NULL OR (p.calificacion IS NOT NULL AND p.calificacion >= :calificacionMin))
              AND (:qIds IS NULL OR p.id IN :qIds)
              AND (:soloConFotos IS NULL OR SIZE(p.imagenes) > 0 OR p.imagenUrl IS NOT NULL)
              AND (:arrendadoresVerificados IS NULL OR p.arrendadorId IN :arrendadoresVerificados)
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
            @Param("calificacionMin") Double calificacionMin,
            @Param("qIds") List<Long> qIds,
            @Param("soloConFotos") Boolean soloConFotos,
            @Param("arrendadoresVerificados") List<Long> arrendadoresVerificados,
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
     *
     * <p><b>Paginación:</b> devuelve un {@link org.springframework.data.domain.Page}. El
     * {@code ORDER BY} (distancia Haversine ascendente) vive en el SQL nativo; el {@link Pageable}
     * se pasa SIN {@code Sort} (unsorted) para que Spring Data solo aplique {@code LIMIT/OFFSET}
     * y NO intente reordenar. La {@code countQuery} replica exactamente el {@code WHERE} (bounding
     * box + Haversine + filtros) para el total. El orden por distancia se garantiza ANTES de
     * paginar (es parte de la propia query).
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
              AND (CAST(:calificacionMin AS double precision) IS NULL
                   OR (p.calificacion IS NOT NULL AND p.calificacion >= CAST(:calificacionMin AS double precision)))
              AND (CAST(:q AS text) IS NULL
                   OR p.busqueda_tsv @@ plainto_tsquery('spanish', CAST(:q AS text)))
              AND (CAST(:soloConFotos AS boolean) IS NULL
                   OR EXISTS (SELECT 1 FROM propiedad_imagenes pi WHERE pi.propiedad_id = p.id)
                   OR p.imagen_url IS NOT NULL)
              AND (:soloVerificados = false OR p.arrendador_id IN (:arrendadoresVerificados))
              AND (6371 * acos( least(1.0, greatest(-1.0,
                    cos(radians(:lat)) * cos(radians(p.latitud)) * cos(radians(p.longitud) - radians(:lng))
                    + sin(radians(:lat)) * sin(radians(p.latitud))
                 )))) <= :radioKm
            ORDER BY (6371 * acos( least(1.0, greatest(-1.0,
                    cos(radians(:lat)) * cos(radians(p.latitud)) * cos(radians(p.longitud) - radians(:lng))
                    + sin(radians(:lat)) * sin(radians(p.latitud))
                 )))) ASC, p.id ASC
            """,
            countQuery = """
            SELECT count(*) FROM propiedades p
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
              AND (CAST(:calificacionMin AS double precision) IS NULL
                   OR (p.calificacion IS NOT NULL AND p.calificacion >= CAST(:calificacionMin AS double precision)))
              AND (CAST(:q AS text) IS NULL
                   OR p.busqueda_tsv @@ plainto_tsquery('spanish', CAST(:q AS text)))
              AND (CAST(:soloConFotos AS boolean) IS NULL
                   OR EXISTS (SELECT 1 FROM propiedad_imagenes pi WHERE pi.propiedad_id = p.id)
                   OR p.imagen_url IS NOT NULL)
              AND (:soloVerificados = false OR p.arrendador_id IN (:arrendadoresVerificados))
              AND (6371 * acos( least(1.0, greatest(-1.0,
                    cos(radians(:lat)) * cos(radians(p.latitud)) * cos(radians(p.longitud) - radians(:lng))
                    + sin(radians(:lat)) * sin(radians(p.latitud))
                 )))) <= :radioKm
            """,
            nativeQuery = true)
    org.springframework.data.domain.Page<Propiedad> buscarCercaPaginado(
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
            @Param("dormitoriosMin") Integer dormitoriosMin,
            @Param("calificacionMin") Double calificacionMin,
            @Param("q") String q,
            @Param("soloConFotos") Boolean soloConFotos,
            @Param("soloVerificados") boolean soloVerificados,
            @Param("arrendadoresVerificados") List<Long> arrendadoresVerificados,
            org.springframework.data.domain.Pageable pageable
    );
}
