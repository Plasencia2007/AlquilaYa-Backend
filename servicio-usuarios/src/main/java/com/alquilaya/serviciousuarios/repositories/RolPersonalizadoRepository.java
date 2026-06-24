package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.RolPersonalizado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RolPersonalizadoRepository extends JpaRepository<RolPersonalizado, Long> {
    Optional<RolPersonalizado> findByNombre(String nombre);
    boolean existsByNombre(String nombre);
}
