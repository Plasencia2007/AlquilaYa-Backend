package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.dto.ResumenEventoAnalyticsDTO;
import com.alquilaya.serviciousuarios.entities.EventoAnalytics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/** Acceso a {@code eventos_analytics}, el sink backend de la telemetría de analítica CLIENTE (ítem 455). */
@Repository
public interface EventoAnalyticsRepository extends JpaRepository<EventoAnalytics, Long> {

    /**
     * Conteo de eventos por tipo dentro de {@code [desde, hasta)}. Base del panel admin
     * ({@code GET /api/v1/usuarios/admin/analytics/resumen}) y de un futuro dashboard.
     * El índice {@code idx_evento_analytics_tipo_fecha (evento, fecha_creacion)} evita el
     * full scan.
     */
    @Query("""
            SELECT new com.alquilaya.serviciousuarios.dto.ResumenEventoAnalyticsDTO(e.evento, COUNT(e))
            FROM EventoAnalytics e
            WHERE e.fechaCreacion >= :desde AND e.fechaCreacion < :hasta
            GROUP BY e.evento
            ORDER BY COUNT(e) DESC
            """)
    List<ResumenEventoAnalyticsDTO> resumenPorEvento(@Param("desde") LocalDateTime desde,
                                                      @Param("hasta") LocalDateTime hasta);
}
