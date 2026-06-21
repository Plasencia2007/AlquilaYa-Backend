package com.alquilaya.servicio_mensajeria.repositories;

import com.alquilaya.servicio_mensajeria.entities.Mensaje;
import com.alquilaya.servicio_mensajeria.enums.EstadoMensaje;
import com.alquilaya.servicio_mensajeria.enums.RolEmisor;
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

    // No-leídos dirigidos al caller (mensajes del OTRO rol, estado=ENVIADO).
    // Se filtra por rol —no por perfilId— porque perfilId colisiona entre roles.
    long countByConversacionIdAndEmisorRolNotAndEstado(
            Long conversacionId, RolEmisor emisorRol, EstadoMensaje estado);

    // Marca como LEIDO todos los mensajes ENVIADO dirigidos al caller, es decir
    // los del OTRO participante (emisorRol distinto al rol del lector).
    @Modifying
    @Query("""
            UPDATE Mensaje m
            SET m.estado = com.alquilaya.servicio_mensajeria.enums.EstadoMensaje.LEIDO,
                m.fechaLectura = :ahora
            WHERE m.conversacion.id = :conversacionId
              AND m.emisorRol <> :lectorRol
              AND m.estado = com.alquilaya.servicio_mensajeria.enums.EstadoMensaje.ENVIADO
            """)
    int marcarLeidos(@Param("conversacionId") Long conversacionId,
                     @Param("lectorRol") RolEmisor lectorRol,
                     @Param("ahora") LocalDateTime ahora);

    List<Mensaje> findTop1ByConversacionIdOrderByFechaEnvioDesc(Long conversacionId);
}
