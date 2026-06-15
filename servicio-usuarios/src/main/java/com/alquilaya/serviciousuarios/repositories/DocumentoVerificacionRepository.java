package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.DocumentoVerificacion;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.EstadoVerificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentoVerificacionRepository extends JpaRepository<DocumentoVerificacion, Long> {

    List<DocumentoVerificacion> findByUsuario(Usuario usuario);

    List<DocumentoVerificacion> findByEstadoVerificacion(EstadoVerificacion estado);

    // Trae el usuario en la misma consulta: el DTO admin necesita nombre/correo
    // y el usuario es LAZY (evita N+1 y LazyInitializationException al mapear).
    @Query("SELECT d FROM DocumentoVerificacion d JOIN FETCH d.usuario WHERE d.estadoVerificacion = :estado")
    List<DocumentoVerificacion> findByEstadoVerificacionConUsuario(@Param("estado") EstadoVerificacion estado);

    long countByUsuarioAndEstadoVerificacion(Usuario usuario, EstadoVerificacion estado);

    Optional<DocumentoVerificacion> findByArchivoUrl(String archivoUrl);
}
