package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.PrecioTemporada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PrecioTemporadaRepository extends JpaRepository<PrecioTemporada, Long> {

    List<PrecioTemporada> findByPropiedadIdOrderByFechaInicioAsc(Long propiedadId);

    Optional<PrecioTemporada> findByIdAndPropiedadId(Long id, Long propiedadId);

    /** Temporada que cubre una fecha (fechaInicio <= fecha <= fechaFin). */
    Optional<PrecioTemporada> findFirstByPropiedadIdAndFechaInicioLessThanEqualAndFechaFinGreaterThanEqualOrderByFechaInicioAsc(
            Long propiedadId, LocalDate fecha, LocalDate fecha2);

    /** ¿Existe alguna temporada que se solape con [ini, fin]? (overlap si existInicio <= fin && existFin >= ini). */
    boolean existsByPropiedadIdAndFechaInicioLessThanEqualAndFechaFinGreaterThanEqual(
            Long propiedadId, LocalDate fin, LocalDate ini);
}
