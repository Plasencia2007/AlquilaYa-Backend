package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.DecisionModeracionPropiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface DecisionModeracionPropiedadRepository extends JpaRepository<DecisionModeracionPropiedad, Long> {

    /** Historial paginado (#366), más reciente primero. */
    Page<DecisionModeracionPropiedad> findAllByOrderByFechaDesc(Pageable pageable);

    /** Conteo real de decisiones por tipo desde una fecha (#356: "aprobadas hoy" / "rechazadas esta semana"). */
    long countByDecisionAndFechaGreaterThanEqual(EstadoPropiedad decision, LocalDateTime desde);
}
