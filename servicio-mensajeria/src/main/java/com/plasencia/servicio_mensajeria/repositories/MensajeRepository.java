package com.plasencia.servicio_mensajeria.repositories;

import com.plasencia.servicio_mensajeria.entities.Mensaje;
import com.plasencia.servicio_mensajeria.enums.EstadoMensaje;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MensajeRepository extends JpaRepository<Mensaje, Long> {

    // Historial visible para participantes (excluye BLOQUEADO).
    Page<Mensaje> findByConversacionIdAndEstadoNotOrderByFechaEnvioAsc(
            Long conversacionId, EstadoMensaje estadoExcluido, Pageable pageable);

    // Historial completo (admin).
    Page<Mensaje> findByConversacionIdOrderByFechaEnvioAsc(Long conversacionId, Pageable pageable);

    // No-leídos dirigidos al caller (mensajes del otro, estado=ENVIADO).
    long countByConversacionIdAndEmisorPerfilIdNotAndEstado(
            Long conversacionId, Long emisorPerfilId, EstadoMensaje estado);

    // Marca como LEIDO todos los mensajes ENVIADO dirigidos al caller.
    @Modifying
    @Query("""
            UPDATE Mensaje m
            SET m.estado = com.plasencia.servicio_mensajeria.enums.EstadoMensaje.LEIDO,
                m.fechaLectura = :ahora
            WHERE m.conversacion.id = :conversacionId
              AND m.emisorPerfilId <> :destinatarioPerfilId
              AND m.estado = com.plasencia.servicio_mensajeria.enums.EstadoMensaje.ENVIADO
            """)
    int marcarLeidos(@Param("conversacionId") Long conversacionId,
                     @Param("destinatarioPerfilId") Long destinatarioPerfilId,
                     @Param("ahora") LocalDateTime ahora);

    List<Mensaje> findTop1ByConversacionIdOrderByFechaEnvioDesc(Long conversacionId);
}
