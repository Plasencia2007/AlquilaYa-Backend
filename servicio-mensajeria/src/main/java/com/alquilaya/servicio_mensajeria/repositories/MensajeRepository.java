package com.alquilaya.servicio_mensajeria.repositories;

import com.alquilaya.servicio_mensajeria.entities.Mensaje;
import com.alquilaya.servicio_mensajeria.enums.EstadoMensaje;
import com.alquilaya.servicio_mensajeria.repositories.projection.MensajeTiempoRespuestaView;
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

    // Historial visible para participantes (excluye BLOQUEADO). Orden DESC: página 0 =
    // mensajes más recientes (patrón estándar de paginación de chat). MensajeService
    // invierte el contenido de la página antes de devolverla, para que cada página ya
    // venga en orden cronológico ascendente lista para renderizar.
    Page<Mensaje> findByConversacionIdAndEstadoNotOrderByFechaEnvioDesc(
            Long conversacionId, EstadoMensaje estadoExcluido, Pageable pageable);

    // Historial completo (admin). Mismo criterio: página 0 = más reciente.
    Page<Mensaje> findByConversacionIdOrderByFechaEnvioDesc(Long conversacionId, Pageable pageable);

    // No-leídos dirigidos al caller (mensajes de la CONTRAPARTE, estado=ENVIADO). Se
    // filtra por emisorPerfilId —no por rol— porque en conversaciones ROOMMATE ambos
    // participantes comparten rol ESTUDIANTE; dentro de una conversación puntual, el
    // perfilId del emisor sí identifica sin ambigüedad quién escribió cada mensaje
    // (verificarAcceso ya garantiza que solo hay dos perfiles posibles en esta fila).
    long countByConversacionIdAndEmisorPerfilIdNotAndEstado(
            Long conversacionId, Long emisorPerfilId, EstadoMensaje estado);

    // Marca como LEIDO todos los mensajes ENVIADO dirigidos al caller, es decir
    // los que NO son suyos (emisorPerfilId distinto al del lector).
    @Modifying
    @Query("""
            UPDATE Mensaje m
            SET m.estado = com.alquilaya.servicio_mensajeria.enums.EstadoMensaje.LEIDO,
                m.fechaLectura = :ahora
            WHERE m.conversacion.id = :conversacionId
              AND m.emisorPerfilId <> :lectorPerfilId
              AND m.estado = com.alquilaya.servicio_mensajeria.enums.EstadoMensaje.ENVIADO
            """)
    int marcarLeidos(@Param("conversacionId") Long conversacionId,
                     @Param("lectorPerfilId") Long lectorPerfilId,
                     @Param("ahora") LocalDateTime ahora);

    List<Mensaje> findTop1ByConversacionIdOrderByFechaEnvioDesc(Long conversacionId);

    /**
     * Barrido de mensajes de TODAS las conversaciones de un arrendador, en el orden que
     * el algoritmo de tiempo de respuesta necesita: agrupado por conversación y, dentro
     * de cada una, cronológico ascendente (por {@code fecha_envio}). Apoyado por el índice
     * {@code idx_msg_conv_fecha (conversacion_id, fecha_envio)}.
     *
     * <p>Excluye mensajes {@code BLOQUEADO} (moderados): un mensaje censurado no cuenta ni
     * como pregunta del estudiante ni como respuesta del arrendador.
     *
     * <p>Proyección ligera (sin {@code contenido}) para acotar memoria: se ejecuta un query
     * por arrendador, no un único barrido del universo de mensajes.
     */
    @Query("""
            SELECT m.conversacion.id AS conversacionId,
                   m.emisorRol       AS emisorRol,
                   m.fechaEnvio      AS fechaEnvio
            FROM Mensaje m
            WHERE m.conversacion.arrendadorId = :arrendadorId
              AND m.estado <> com.alquilaya.servicio_mensajeria.enums.EstadoMensaje.BLOQUEADO
            ORDER BY m.conversacion.id ASC, m.fechaEnvio ASC
            """)
    List<MensajeTiempoRespuestaView> findParaMetricaTiempoRespuesta(@Param("arrendadorId") Long arrendadorId);
}
