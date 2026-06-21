package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.Habitacion;
import com.alquilaya.serviciopropiedades.enums.EstadoHabitacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface HabitacionRepository extends JpaRepository<Habitacion, Long> {

    List<Habitacion> findByPropiedadIdOrderByOrdenAscIdAsc(Long propiedadId);

    Optional<Habitacion> findByIdAndPropiedadId(Long id, Long propiedadId);

    long countByPropiedadId(Long propiedadId);

    /** Cuenta habitaciones en un estado dado para una sola propiedad (badge ÚLTIMA PLAZA en el detalle). */
    long countByPropiedadIdAndEstado(Long propiedadId, EstadoHabitacion estado);

    /**
     * Cuenta habitaciones en un estado dado para un conjunto de propiedades en UNA sola query
     * (anti N+1 al pintar badges en el listado). Devuelve filas [propiedadId, count].
     */
    @Query("SELECT h.propiedadId, COUNT(h) FROM Habitacion h "
            + "WHERE h.propiedadId IN :ids AND h.estado = :estado GROUP BY h.propiedadId")
    List<Object[]> contarPorEstadoEnPropiedades(@Param("ids") List<Long> ids,
                                                @Param("estado") EstadoHabitacion estado);

    @Transactional
    void deleteByPropiedadId(Long propiedadId);
}
