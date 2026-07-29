package com.alquilaya.serviciopagos.repositories;

import com.alquilaya.serviciopagos.entities.Cupon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CuponRepository extends JpaRepository<Cupon, Long> {
    Optional<Cupon> findByCodigoIgnoreCase(String codigo);
    List<Cupon> findAllByOrderByFechaCreacionDesc();
}
