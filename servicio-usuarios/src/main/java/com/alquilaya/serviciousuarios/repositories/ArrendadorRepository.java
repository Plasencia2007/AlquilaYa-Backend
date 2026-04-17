package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.Arrendador;
import com.alquilaya.serviciousuarios.entities.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ArrendadorRepository extends JpaRepository<Arrendador, Long> {
    Optional<Arrendador> findByUsuario(Usuario usuario);
}
