package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.DocumentoVerificacion;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.enums.EstadoVerificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentoVerificacionRepository extends JpaRepository<DocumentoVerificacion, Long> {
    
    List<DocumentoVerificacion> findByUsuario(Usuario usuario);
    
    List<DocumentoVerificacion> findByEstadoVerificacion(EstadoVerificacion estado);
    
    long countByUsuarioAndEstadoVerificacion(Usuario usuario, EstadoVerificacion estado);
}
