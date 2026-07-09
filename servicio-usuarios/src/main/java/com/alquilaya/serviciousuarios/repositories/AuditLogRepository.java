package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * Búsqueda paginada de auditoría con filtros opcionales (todos aceptan null → no filtran):
     * actor (subcadena del correo, case-insensitive), acción exacta y rango de fechas.
     */
    @Query("""
            SELECT a FROM AuditLog a
            WHERE (:actor IS NULL OR LOWER(a.actorCorreo) LIKE LOWER(CONCAT('%', :actor, '%')))
              AND (:accion IS NULL OR a.accion = :accion)
              AND (:desde IS NULL OR a.fecha >= :desde)
              AND (:hasta IS NULL OR a.fecha <= :hasta)
            """)
    Page<AuditLog> buscar(@Param("actor") String actor,
                          @Param("accion") String accion,
                          @Param("desde") LocalDateTime desde,
                          @Param("hasta") LocalDateTime hasta,
                          Pageable pageable);
}
