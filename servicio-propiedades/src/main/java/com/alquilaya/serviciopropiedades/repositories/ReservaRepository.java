package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Repository
public interface ReservaRepository extends JpaRepository<Reserva, Long> {
    List<Reserva> findByEstudianteIdOrderByFechaCreacionDesc(Long estudianteId);

    List<Reserva> findByArrendadorIdOrderByFechaCreacionDesc(Long arrendadorId);

    List<Reserva> findByArrendadorIdAndEstadoOrderByFechaCreacionDesc(Long arrendadorId, EstadoReserva estado);

    List<Reserva> findByPropiedadIdAndEstadoIn(Long propiedadId, Collection<EstadoReserva> estados);

    boolean existsByEstudianteIdAndPropiedadIdAndEstado(Long estudianteId, Long propiedadId, EstadoReserva estado);

    boolean existsByPropiedadIdAndEstadoInAndFechaInicioLessThanEqualAndFechaFinGreaterThanEqual(
            Long propiedadId, Collection<EstadoReserva> estados, LocalDate fechaFin, LocalDate fechaInicio);
}
