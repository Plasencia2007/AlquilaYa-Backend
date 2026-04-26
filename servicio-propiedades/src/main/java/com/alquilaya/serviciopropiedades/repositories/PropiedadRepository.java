package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.Propiedad;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface PropiedadRepository extends JpaRepository<Propiedad, Long> {
    List<Propiedad> findByArrendadorId(Long arrendadorId);

    // Lock pesimista para serializar creaciones de reserva concurrentes sobre la misma propiedad.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Propiedad p WHERE p.id = :id")
    Optional<Propiedad> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            SELECT DISTINCT p FROM Propiedad p
            LEFT JOIN p.serviciosIncluidos s
            WHERE p.aprobadoPorAdmin = true
              AND (:precioMin IS NULL OR p.precio >= :precioMin)
              AND (:precioMax IS NULL OR p.precio <= :precioMax)
              AND (:tipo IS NULL OR p.tipoPropiedad = :tipo)
              AND (:periodo IS NULL OR p.periodoAlquiler = :periodo)
              AND (:disponible IS NULL OR p.estaDisponible = :disponible)
              AND (:distanciaMax IS NULL OR p.distanciaMetros IS NULL OR p.distanciaMetros <= :distanciaMax)
              AND (:servicios IS NULL OR s IN :servicios)
            """)
    List<Propiedad> buscar(
            @Param("precioMin") BigDecimal precioMin,
            @Param("precioMax") BigDecimal precioMax,
            @Param("tipo") String tipo,
            @Param("periodo") String periodo,
            @Param("disponible") Boolean disponible,
            @Param("distanciaMax") Integer distanciaMax,
            @Param("servicios") List<String> servicios
    );
}
