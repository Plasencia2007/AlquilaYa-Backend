package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.Funcionalidad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FuncionalidadRepository extends JpaRepository<Funcionalidad, Long> {
    Optional<Funcionalidad> findByClave(String clave);
    boolean existsByClave(String clave);
}
