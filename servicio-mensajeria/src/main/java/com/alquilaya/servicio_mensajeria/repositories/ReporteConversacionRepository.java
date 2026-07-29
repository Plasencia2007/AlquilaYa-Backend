package com.alquilaya.servicio_mensajeria.repositories;

import com.alquilaya.servicio_mensajeria.entities.ReporteConversacion;
import com.alquilaya.servicio_mensajeria.enums.EstadoReporte;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReporteConversacionRepository extends JpaRepository<ReporteConversacion, Long> {

    Page<ReporteConversacion> findByEstadoOrderByFechaCreacionDesc(EstadoReporte estado, Pageable pageable);

    Page<ReporteConversacion> findAllByOrderByFechaCreacionDesc(Pageable pageable);
}
