package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.ResenaEstudiante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResenaEstudianteRepository extends JpaRepository<ResenaEstudiante, Long> {

    List<ResenaEstudiante> findByEstudianteIdAndVisibleTrueOrderByFechaCreacionDesc(Long estudianteId);

    List<ResenaEstudiante> findByArrendadorIdOrderByFechaCreacionDesc(Long arrendadorId);

    boolean existsByArrendadorIdAndEstudianteId(Long arrendadorId, Long estudianteId);
}
