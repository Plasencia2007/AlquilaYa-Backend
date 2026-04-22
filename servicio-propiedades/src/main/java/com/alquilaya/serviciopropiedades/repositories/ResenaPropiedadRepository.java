package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.ResenaPropiedad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResenaPropiedadRepository extends JpaRepository<ResenaPropiedad, Long> {
    List<ResenaPropiedad> findByPropiedadIdAndVisibleTrueOrderByFechaCreacionDesc(Long propiedadId);

    @Query("SELECT AVG(r.rating) FROM ResenaPropiedad r WHERE r.propiedadId = :propiedadId AND r.visible = true")
    Double promedioRating(@Param("propiedadId") Long propiedadId);

    long countByPropiedadIdAndVisibleTrue(Long propiedadId);
}
