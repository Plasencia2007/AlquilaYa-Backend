package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.EventoPropiedad;
import com.alquilaya.serviciopropiedades.enums.TipoEvento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventoPropiedadRepository extends JpaRepository<EventoPropiedad, Long> {

    long countByPropiedadIdAndTipo(Long propiedadId, TipoEvento tipo);

    long countByPropiedadIdAndTipoAndFechaCreacionAfter(
            Long propiedadId, TipoEvento tipo, LocalDateTime desde);

    /** Conteo por día de un tipo de evento desde una fecha (para el gráfico de vistas por ventana). */
    @Query("""
            SELECT CAST(e.fechaCreacion AS date) AS dia, COUNT(e) AS total
            FROM EventoPropiedad e
            WHERE e.propiedadId = :propiedadId AND e.tipo = :tipo AND e.fechaCreacion >= :desde
            GROUP BY CAST(e.fechaCreacion AS date)
            ORDER BY CAST(e.fechaCreacion AS date)
            """)
    List<Object[]> conteoPorDia(@Param("propiedadId") Long propiedadId,
                                @Param("tipo") TipoEvento tipo,
                                @Param("desde") LocalDateTime desde);
}
