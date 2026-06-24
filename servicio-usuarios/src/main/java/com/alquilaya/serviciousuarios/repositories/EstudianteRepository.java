package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EstudianteRepository extends JpaRepository<Estudiante, Long> {
    Optional<Estudiante> findByUsuario(Usuario usuario);

    /** Estudiantes que activaron "estoy buscando compañeros" — board de matchmaking (#38 Fase 1). */
    List<Estudiante> findByBuscaCompanerosTrue();
}
