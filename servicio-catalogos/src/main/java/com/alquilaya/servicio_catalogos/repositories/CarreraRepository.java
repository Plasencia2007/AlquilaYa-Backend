package com.alquilaya.servicio_catalogos.repositories;

import com.alquilaya.servicio_catalogos.entities.Carrera;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CarreraRepository extends JpaRepository<Carrera, Long> {

    List<Carrera> findByActivoTrueOrderByNombreAsc();

    List<Carrera> findAllByOrderByNombreAsc();

    Optional<Carrera> findByNombreIgnoreCase(String nombre);

    boolean existsByNombreIgnoreCase(String nombre);

    boolean existsByIdAndActivoTrue(Long id);
}
