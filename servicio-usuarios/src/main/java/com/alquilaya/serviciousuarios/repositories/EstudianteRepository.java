package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EstudianteRepository extends JpaRepository<Estudiante, Long> {
    Optional<Estudiante> findByUsuario(Usuario usuario);

    /** Estudiantes que activaron "estoy buscando compañeros" — board de matchmaking (#38 Fase 1). */
    List<Estudiante> findByBuscaCompanerosTrue();

    /** Carreras distintas con al menos un estudiante (ítem 381) — para el <select> de segmento
     *  del formulario de campaña de WhatsApp en el frontend. */
    @Query("SELECT DISTINCT e.carrera FROM Estudiante e WHERE e.carrera IS NOT NULL AND e.carrera <> '' ORDER BY e.carrera ASC")
    List<String> carrerasDistintas();
}
