package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.Denuncia;
import com.alquilaya.serviciopropiedades.enums.EstadoDenuncia;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface DenunciaRepository extends JpaRepository<Denuncia, Long> {

    Page<Denuncia> findByEstadoOrderByFechaCreacionDesc(EstadoDenuncia estado, Pageable pageable);

    Page<Denuncia> findAllByOrderByFechaCreacionDesc(Pageable pageable);

    List<Denuncia> findByPropiedadIdOrderByFechaCreacionDesc(Long propiedadId);

    long countByPropiedadIdAndEstado(Long propiedadId, EstadoDenuncia estado);

    boolean existsByPropiedadIdAndDenuncianteId(Long propiedadId, Long denuncianteId);

    /** Conteo agregado por estado (ítem 376): reemplaza el "—" hardcodeado del panel admin. */
    long countByEstado(EstadoDenuncia estado);

    /**
     * Total de denuncias (cualquier estado) por propiedad, en batch, para las propiedades de la
     * página actual — evita N+1 al calcular la "severidad real" (ítem 376: ALTA si una misma
     * propiedad acumula ≥2 denuncias).
     */
    @Query("SELECT d.propiedadId AS propiedadId, COUNT(d) AS total FROM Denuncia d " +
            "WHERE d.propiedadId IN :propiedadIds GROUP BY d.propiedadId")
    List<ConteoPorPropiedad> countByPropiedadIdIn(@Param("propiedadIds") Collection<Long> propiedadIds);

    interface ConteoPorPropiedad {
        Long getPropiedadId();
        Long getTotal();
    }
}
