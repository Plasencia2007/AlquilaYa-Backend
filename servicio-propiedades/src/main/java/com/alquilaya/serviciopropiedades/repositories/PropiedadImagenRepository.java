package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.PropiedadImagen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PropiedadImagenRepository extends JpaRepository<PropiedadImagen, Long> {
    List<PropiedadImagen> findByPropiedadIdOrderByOrdenAsc(Long propiedadId);
}
