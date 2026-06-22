package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.Favorito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoritoRepository extends JpaRepository<Favorito, Long> {
    List<Favorito> findByEstudianteIdOrderByFechaCreacionDesc(Long estudianteId);

    Page<Favorito> findByEstudianteIdOrderByFechaCreacionDesc(Long estudianteId, Pageable pageable);

    @Query("SELECT f.propiedadId FROM Favorito f WHERE f.estudianteId = :estudianteId")
    List<Long> findPropiedadIdsByEstudianteId(Long estudianteId);

    Optional<Favorito> findByEstudianteIdAndPropiedadId(Long estudianteId, Long propiedadId);

    boolean existsByEstudianteIdAndPropiedadId(Long estudianteId, Long propiedadId);

    /** Cuántos estudiantes marcaron como favorita esta propiedad (embudo de analítica). */
    long countByPropiedadId(Long propiedadId);

    @Modifying
    @Query("DELETE FROM Favorito f WHERE f.estudianteId = :estudianteId AND f.propiedadId = :propiedadId")
    int deleteByEstudianteIdAndPropiedadId(Long estudianteId, Long propiedadId);
}
