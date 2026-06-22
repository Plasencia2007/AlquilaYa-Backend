package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.Denuncia;
import com.alquilaya.serviciopropiedades.enums.EstadoDenuncia;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DenunciaRepository extends JpaRepository<Denuncia, Long> {

    Page<Denuncia> findByEstadoOrderByFechaCreacionDesc(EstadoDenuncia estado, Pageable pageable);

    Page<Denuncia> findAllByOrderByFechaCreacionDesc(Pageable pageable);

    List<Denuncia> findByPropiedadIdOrderByFechaCreacionDesc(Long propiedadId);

    long countByPropiedadIdAndEstado(Long propiedadId, EstadoDenuncia estado);

    boolean existsByPropiedadIdAndDenuncianteId(Long propiedadId, Long denuncianteId);
}
