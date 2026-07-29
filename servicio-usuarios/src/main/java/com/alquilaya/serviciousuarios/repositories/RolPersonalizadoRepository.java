package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.RolPersonalizado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RolPersonalizadoRepository extends JpaRepository<RolPersonalizado, Long> {
    Optional<RolPersonalizado> findByNombre(String nombre);
    boolean existsByNombre(String nombre);

    /**
     * Si algún rol personalizado (#32, RBAC dinámico) otorga esta funcionalidad — se usa
     * junto con {@code PermisoRepository.countByFuncionalidadAndHabilitadoTrue} para el guard
     * del último admin (#387): un rol personalizado también puede ser la única fuente de
     * ADMIN_PANEL, no solo la matriz de roles base.
     */
    @Query("SELECT COUNT(r) > 0 FROM RolPersonalizado r WHERE :funcionalidad MEMBER OF r.funcionalidades")
    boolean existsByFuncionalidad(@Param("funcionalidad") String funcionalidad);
}
