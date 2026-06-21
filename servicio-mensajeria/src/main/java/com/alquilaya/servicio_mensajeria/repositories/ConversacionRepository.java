package com.alquilaya.servicio_mensajeria.repositories;

import com.alquilaya.servicio_mensajeria.entities.Conversacion;
import com.alquilaya.servicio_mensajeria.enums.EstadoConversacion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversacionRepository extends JpaRepository<Conversacion, Long> {

    Optional<Conversacion> findByEstudianteIdAndArrendadorIdAndPropiedadId(
            Long estudianteId, Long arrendadorId, Long propiedadId);

    // Conversaciones del participante. Se filtra por (perfilId, rol) y no solo por
    // perfilId, porque perfilId colisiona entre roles (estudiante#1 y arrendador#1
    // son personas distintas): comparar solo por id mezclaría sus conversaciones.
    @Query("""
            SELECT c FROM Conversacion c
            WHERE (:rol = 'ESTUDIANTE' AND c.estudianteId = :perfilId)
               OR (:rol = 'ARRENDADOR' AND c.arrendadorId = :perfilId)
            ORDER BY c.fechaUltimaActividad DESC
            """)
    List<Conversacion> findDelParticipante(@Param("perfilId") Long perfilId,
                                           @Param("rol") String rol);

    // Admin: listado con filtros opcionales y paginado.
    @Query("""
            SELECT c FROM Conversacion c
            WHERE (:estado IS NULL OR c.estado = :estado)
              AND (:estudianteId IS NULL OR c.estudianteId = :estudianteId)
              AND (:arrendadorId IS NULL OR c.arrendadorId = :arrendadorId)
              AND (:propiedadId IS NULL OR c.propiedadId = :propiedadId)
            ORDER BY c.fechaUltimaActividad DESC
            """)
    Page<Conversacion> buscarParaAdmin(
            @Param("estado") EstadoConversacion estado,
            @Param("estudianteId") Long estudianteId,
            @Param("arrendadorId") Long arrendadorId,
            @Param("propiedadId") Long propiedadId,
            Pageable pageable);
}
