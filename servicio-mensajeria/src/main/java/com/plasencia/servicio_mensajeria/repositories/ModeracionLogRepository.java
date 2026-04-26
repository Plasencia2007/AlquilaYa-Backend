package com.plasencia.servicio_mensajeria.repositories;

import com.plasencia.servicio_mensajeria.entities.ModeracionLog;
import com.plasencia.servicio_mensajeria.enums.TargetModeracion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ModeracionLogRepository extends JpaRepository<ModeracionLog, Long> {

    @Query("""
            SELECT l FROM ModeracionLog l
            WHERE (:targetType IS NULL OR l.targetType = :targetType)
              AND (:targetId IS NULL OR l.targetId = :targetId)
            ORDER BY l.fecha DESC
            """)
    Page<ModeracionLog> buscar(
            @Param("targetType") TargetModeracion targetType,
            @Param("targetId") Long targetId,
            Pageable pageable);
}
