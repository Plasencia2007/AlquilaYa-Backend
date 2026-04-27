package com.alquilaya.servicio_mensajeria.repositories;

import com.alquilaya.servicio_mensajeria.entities.Notificacion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {

    Page<Notificacion> findByUsuarioIdOrderByFechaCreacionDesc(Long usuarioId, Pageable pageable);

    long countByUsuarioIdAndLeidaFalse(Long usuarioId);

    @Modifying
    @Query("UPDATE Notificacion n SET n.leida = true, n.fechaLectura = :ahora " +
            "WHERE n.id = :id AND n.usuarioId = :usuarioId AND n.leida = false")
    int marcarLeida(@Param("id") Long id,
                    @Param("usuarioId") Long usuarioId,
                    @Param("ahora") LocalDateTime ahora);

    @Modifying
    @Query("UPDATE Notificacion n SET n.leida = true, n.fechaLectura = :ahora " +
            "WHERE n.usuarioId = :usuarioId AND n.leida = false")
    int marcarTodasLeidas(@Param("usuarioId") Long usuarioId,
                          @Param("ahora") LocalDateTime ahora);
}
