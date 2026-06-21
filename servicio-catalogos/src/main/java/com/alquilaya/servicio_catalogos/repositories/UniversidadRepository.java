package com.alquilaya.servicio_catalogos.repositories;

import com.alquilaya.servicio_catalogos.entities.Universidad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UniversidadRepository extends JpaRepository<Universidad, Long> {

    List<Universidad> findByActivoTrueOrderByNombreAsc();

    List<Universidad> findAllByOrderByNombreAsc();

    Optional<Universidad> findByNombreIgnoreCase(String nombre);

    boolean existsByNombreIgnoreCase(String nombre);

    boolean existsByIdAndActivoTrue(Long id);

    /** Campus principal explícito (activo). */
    Optional<Universidad> findFirstByEsPrincipalTrueAndActivoTrueOrderByNombreAsc();

    /** Deja a {@code id} como única universidad principal (quita el flag a todas las demás). */
    @Modifying
    @Query("UPDATE Universidad u SET u.esPrincipal = false WHERE u.id <> :id")
    void clearPrincipalExcept(@Param("id") Long id);
}
