package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.SecurityEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/** Acceso a {@code security_events} — panel admin de alertas de seguridad (ítem 351). */
@Repository
public interface SecurityEventRepository extends JpaRepository<SecurityEvent, Long> {

    /**
     * Página de eventos desde {@code desde} (inclusive), más reciente primero. {@code desde}
     * nullable = sin filtro de fecha (mismo patrón {@code (:param IS NULL OR ...)} que
     * {@code PropiedadRepository#buscar}). El {@link Pageable} se pasa sin {@code Sort} propio
     * (el ORDER BY ya va en la JPQL) — mismo patrón que {@code PropiedadRepository#buscarCercaPaginado}.
     */
    @Query("""
            SELECT e FROM SecurityEvent e
            WHERE (:desde IS NULL OR e.fecha >= :desde)
            ORDER BY e.fecha DESC
            """)
    Page<SecurityEvent> buscar(@Param("desde") LocalDateTime desde, Pageable pageable);
}
