package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.ResenaPropiedad;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResenaPropiedadRepository extends JpaRepository<ResenaPropiedad, Long> {
    List<ResenaPropiedad> findByPropiedadIdAndVisibleTrueOrderByFechaCreacionDesc(Long propiedadId);

    /** Todas las reseñas (incluidas ocultas) para el panel de moderación admin. */
    Page<ResenaPropiedad> findAllByOrderByFechaCreacionDesc(Pageable pageable);

    /**
     * Reseñas "destacadas" para la prueba social de la home (#85): visibles, con comentario
     * no vacío y rating alto, ordenadas por rating y luego recencia. El límite se pasa por
     * {@link Pageable} (p.ej. las 5 mejores).
     */
    @Query("""
            SELECT r FROM ResenaPropiedad r
            WHERE r.visible = true
              AND r.rating >= :minRating
              AND r.comentario IS NOT NULL
              AND LENGTH(TRIM(r.comentario)) > 0
            ORDER BY r.rating DESC, r.fechaCreacion DESC
            """)
    List<ResenaPropiedad> findDestacadas(@Param("minRating") int minRating, Pageable pageable);

    /** Total de reseñas de propiedad visibles (#86 stats). */
    long countByVisibleTrue();

    /** Promedio global de calificación sobre reseñas visibles; null si aún no hay ninguna. */
    @Query("SELECT AVG(r.rating) FROM ResenaPropiedad r WHERE r.visible = true")
    Double promedioGlobal();

    /**
     * Promedio global sobre TODAS las reseñas de propiedad, incluidas las ocultas (#357). El
     * panel de moderación admin necesita ver el agregado real (lo que hay en BD), no solo el
     * que ve el público (que excluye las ocultas vía {@link #promedioGlobal()}). Null si aún no
     * hay ninguna reseña.
     */
    @Query("SELECT AVG(r.rating) FROM ResenaPropiedad r")
    Double promedioGlobalTodas();

    @Query("SELECT AVG(r.rating) FROM ResenaPropiedad r WHERE r.propiedadId = :propiedadId AND r.visible = true")
    Double promedioRating(@Param("propiedadId") Long propiedadId);

    /** Promedios por sub-categoría (limpieza, ubicación, precio, trato) en una sola query. */
    @Query("SELECT AVG(r.ratingLimpieza), AVG(r.ratingUbicacion), AVG(r.ratingPrecio), AVG(r.ratingTrato) "
            + "FROM ResenaPropiedad r WHERE r.propiedadId = :propiedadId AND r.visible = true")
    List<Object[]> promediosCategorias(@Param("propiedadId") Long propiedadId);

    long countByPropiedadIdAndVisibleTrue(Long propiedadId);

    boolean existsByEstudianteIdAndPropiedadId(Long estudianteId, Long propiedadId);
}
