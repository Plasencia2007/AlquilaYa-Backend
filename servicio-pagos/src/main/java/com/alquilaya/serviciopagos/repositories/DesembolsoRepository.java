package com.alquilaya.serviciopagos.repositories;

import com.alquilaya.serviciopagos.entities.Desembolso;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DesembolsoRepository extends JpaRepository<Desembolso, Long> {
    List<Desembolso> findByArrendadorIdOrderByFechaCreacionDesc(Long arrendadorId);
    List<Desembolso> findByEstadoOrderByFechaCreacionAsc(String estado);
}
