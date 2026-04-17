package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.Permiso;
import com.alquilaya.serviciousuarios.enums.Rol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PermisoRepository extends JpaRepository<Permiso, Long> {
    List<Permiso> findByRol(Rol rol);
    Optional<Permiso> findByRolAndFuncionalidad(Rol rol, String funcionalidad);
}
