package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.ResenaArrendador;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResenaArrendadorRepository extends JpaRepository<ResenaArrendador, Long> {
    List<ResenaArrendador> findByArrendadorIdAndVisibleTrueOrderByFechaCreacionDesc(Long arrendadorId);

    @Query("SELECT AVG(r.rating) FROM ResenaArrendador r WHERE r.arrendadorId = :arrendadorId AND r.visible = true")
    Double promedioRating(@Param("arrendadorId") Long arrendadorId);

    long countByArrendadorIdAndVisibleTrue(Long arrendadorId);
}
