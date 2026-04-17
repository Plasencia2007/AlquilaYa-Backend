package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.Propiedad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PropiedadRepository extends JpaRepository<Propiedad, Long> {
    List<Propiedad> findByArrendadorId(Long arrendadorId);
}
