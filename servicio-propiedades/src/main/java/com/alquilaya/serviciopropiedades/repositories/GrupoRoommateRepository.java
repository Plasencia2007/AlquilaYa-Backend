package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.GrupoRoommate;
import com.alquilaya.serviciopropiedades.enums.EstadoGrupo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GrupoRoommateRepository extends JpaRepository<GrupoRoommate, Long> {

    Optional<GrupoRoommate> findByCodigoInvitacion(String codigoInvitacion);

    List<GrupoRoommate> findByPropiedadIdAndEstado(Long propiedadId, EstadoGrupo estado);

    /** Grupos en los que participa un estudiante (creador o miembro). */
    @Query("""
            SELECT DISTINCT g FROM GrupoRoommate g
            JOIN g.miembros m
            WHERE m.estudianteId = :estudianteId
            ORDER BY g.fechaCreacion DESC
            """)
    List<GrupoRoommate> findByMiembro(@Param("estudianteId") Long estudianteId);
}
