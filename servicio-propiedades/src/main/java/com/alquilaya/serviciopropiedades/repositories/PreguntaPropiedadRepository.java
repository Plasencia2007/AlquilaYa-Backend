package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.PreguntaPropiedad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PreguntaPropiedadRepository extends JpaRepository<PreguntaPropiedad, Long> {
    List<PreguntaPropiedad> findByPropiedadIdAndVisibleTrueOrderByFechaCreacionDesc(Long propiedadId);
}
