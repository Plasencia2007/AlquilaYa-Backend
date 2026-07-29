package com.alquilaya.servicio_mensajeria.repositories;

import com.alquilaya.servicio_mensajeria.entities.Conversacion;
import com.alquilaya.servicio_mensajeria.enums.EstadoConversacion;
import com.alquilaya.servicio_mensajeria.enums.TipoConversacion;
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

    // Idempotencia de conversaciones ROOMMATE: el service siempre llama con
    // (menor, mayor) de los dos ids, ver Conversacion#tipo.
    Optional<Conversacion> findByEstudianteIdAndEstudiante2IdAndTipo(
            Long estudianteId, Long estudiante2Id, TipoConversacion tipo);

    // Arrendadores con al menos una conversación. Universo a recalcular en el job de
    // tiempo de respuesta: se procesa uno por uno (un query de mensajes por arrendador).
    // Excluye ROOMMATE (arrendadorId null): esa métrica solo aplica al flujo con arrendador.
    @Query("SELECT DISTINCT c.arrendadorId FROM Conversacion c WHERE c.arrendadorId IS NOT NULL")
    List<Long> findArrendadorIdsDistintos();

    // Conversaciones del participante. Se filtra por (perfilId, rol) y no solo por
    // perfilId, porque perfilId colisiona entre roles (estudiante#1 y arrendador#1
    // son personas distintas): comparar solo por id mezclaría sus conversaciones. Un
    // ESTUDIANTE puede aparecer como estudianteId (ambos tipos) o estudiante2Id (solo
    // ROOMMATE, siempre null en ESTUDIANTE_ARRENDADOR, así que no hay falsos positivos).
    @Query("""
            SELECT c FROM Conversacion c
            WHERE (:rol = 'ESTUDIANTE' AND (c.estudianteId = :perfilId OR c.estudiante2Id = :perfilId))
               OR (:rol = 'ARRENDADOR' AND c.arrendadorId = :perfilId)
            ORDER BY c.fechaUltimaActividad DESC
            """)
    List<Conversacion> findDelParticipante(@Param("perfilId") Long perfilId,
                                           @Param("rol") String rol);

    // Ítem 264: misma condición que findDelParticipante pero paginada, para el endpoint
    // nuevo GET /conversaciones/paginadas. No reemplaza findDelParticipante (ese List lo
    // siguen consumiendo el listado sin paginar y los cálculos de badges de no-leídos).
    @Query("""
            SELECT c FROM Conversacion c
            WHERE (:rol = 'ESTUDIANTE' AND (c.estudianteId = :perfilId OR c.estudiante2Id = :perfilId))
               OR (:rol = 'ARRENDADOR' AND c.arrendadorId = :perfilId)
            ORDER BY c.fechaUltimaActividad DESC
            """)
    Page<Conversacion> findDelParticipantePaginado(@Param("perfilId") Long perfilId,
                                                    @Param("rol") String rol,
                                                    Pageable pageable);

    // Admin: listado con filtros opcionales y paginado. `q` (ítem 384) es un filtro
    // case-insensitive (equivalente a ILIKE) sobre el contenido de al menos un mensaje de la
    // conversación — vía EXISTS para no duplicar filas cuando hay varios mensajes que matchean.
    @Query("""
            SELECT c FROM Conversacion c
            WHERE (:estado IS NULL OR c.estado = :estado)
              AND (:estudianteId IS NULL OR c.estudianteId = :estudianteId)
              AND (:arrendadorId IS NULL OR c.arrendadorId = :arrendadorId)
              AND (:propiedadId IS NULL OR c.propiedadId = :propiedadId)
              AND (:q IS NULL OR EXISTS (
                    SELECT 1 FROM Mensaje m
                    WHERE m.conversacion = c AND LOWER(m.contenido) LIKE LOWER(CONCAT('%', :q, '%'))
              ))
            ORDER BY c.fechaUltimaActividad DESC
            """)
    Page<Conversacion> buscarParaAdmin(
            @Param("estado") EstadoConversacion estado,
            @Param("estudianteId") Long estudianteId,
            @Param("arrendadorId") Long arrendadorId,
            @Param("propiedadId") Long propiedadId,
            @Param("q") String q,
            Pageable pageable);
}
