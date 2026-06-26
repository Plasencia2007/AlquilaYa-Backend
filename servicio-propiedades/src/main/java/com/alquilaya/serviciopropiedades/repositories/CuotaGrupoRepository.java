package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.CuotaGrupo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CuotaGrupoRepository extends JpaRepository<CuotaGrupo, Long> {
    List<CuotaGrupo> findByReservaId(Long reservaId);
    Optional<CuotaGrupo> findByReservaIdAndEstudianteId(Long reservaId, Long estudianteId);
    List<CuotaGrupo> findByGrupoId(Long grupoId);
}
