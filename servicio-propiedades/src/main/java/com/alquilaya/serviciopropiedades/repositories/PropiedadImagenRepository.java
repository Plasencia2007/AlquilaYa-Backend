package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.PropiedadImagen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PropiedadImagenRepository extends JpaRepository<PropiedadImagen, Long> {
    List<PropiedadImagen> findByPropiedadIdOrderByOrdenAsc(Long propiedadId);

    /** Cuántas propiedades DISTINTAS usan exactamente esta misma URL de imagen (catfishing #50). */
    @Query("SELECT COUNT(DISTINCT i.propiedad.id) FROM PropiedadImagen i WHERE i.url = :url")
    long contarPropiedadesConImagen(@Param("url") String url);
}
