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

    @Query("SELECT AVG(r.rating) FROM ResenaPropiedad r WHERE r.propiedadId = :propiedadId AND r.visible = true")
    Double promedioRating(@Param("propiedadId") Long propiedadId);

    /** Promedios por sub-categoría (limpieza, ubicación, precio, trato) en una sola query. */
    @Query("SELECT AVG(r.ratingLimpieza), AVG(r.ratingUbicacion), AVG(r.ratingPrecio), AVG(r.ratingTrato) "
            + "FROM ResenaPropiedad r WHERE r.propiedadId = :propiedadId AND r.visible = true")
    List<Object[]> promediosCategorias(@Param("propiedadId") Long propiedadId);

    long countByPropiedadIdAndVisibleTrue(Long propiedadId);

    boolean existsByEstudianteIdAndPropiedadId(Long estudianteId, Long propiedadId);
}
