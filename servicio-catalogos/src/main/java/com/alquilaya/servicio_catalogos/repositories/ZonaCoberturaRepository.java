package com.alquilaya.servicio_catalogos.repositories;

import com.alquilaya.servicio_catalogos.entities.ZonaCobertura;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ZonaCoberturaRepository extends JpaRepository<ZonaCobertura, Long> {

    List<ZonaCobertura> findByUniversidadIdOrderByOrdenPrioridadAsc(Long universidadId);

    void deleteByUniversidadId(Long universidadId);
}
