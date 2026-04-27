package com.alquilaya.servicio_mensajeria.services;

import com.alquilaya.servicio_mensajeria.config.CurrentUser;
import com.alquilaya.servicio_mensajeria.dto.NotificacionDTO;
import com.alquilaya.servicio_mensajeria.entities.Notificacion;
import com.alquilaya.servicio_mensajeria.enums.TipoNotificacion;
import com.alquilaya.servicio_mensajeria.repositories.NotificacionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * CRUD de notificaciones in-app + push WebSocket. Las notificaciones se crean
 * desde Kafka consumers (eventos externos) o desde el propio servicio
 * (ej. {@link MensajeService} cuando llega un mensaje nuevo).
 *
 * NOTA semántica: `usuarioId` aquí refiere al **userId** del JWT (no perfilId).
 * El frontend lee `userId` del JWT decodificado y se suscribe al destino
 * `/topic/notificaciones.{userId}`. El interceptor WebSocket valida que la
 * suscripción coincida con el `userId` del Principal.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificacionService {

    public static final String PREFIJO_DESTINO = "/topic/notificaciones.";

    private final NotificacionRepository repo;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public Page<NotificacionDTO> listarMias(CurrentUser user, Pageable pageable) {
        if (user == null || user.getUserId() == null) {
            throw new IllegalStateException("Usuario no autenticado");
        }
        return repo.findByUsuarioIdOrderByFechaCreacionDesc(user.getUserId(), pageable)
                .map(NotificacionDTO::from);
    }

    @Transactional(readOnly = true)
    public long contarNoLeidas(CurrentUser user) {
        if (user == null || user.getUserId() == null) return 0;
        return repo.countByUsuarioIdAndLeidaFalse(user.getUserId());
    }

    @Transactional
    public boolean marcarLeida(Long id, CurrentUser user) {
        if (user == null || user.getUserId() == null) return false;
        return repo.marcarLeida(id, user.getUserId(), LocalDateTime.now()) > 0;
    }

    @Transactional
    public int marcarTodasLeidas(CurrentUser user) {
        if (user == null || user.getUserId() == null) return 0;
        return repo.marcarTodasLeidas(user.getUserId(), LocalDateTime.now());
    }

    /**
     * Crea y persiste una notificación. Si `pushEnVivo`, también la envía por
     * WebSocket al usuario destinatario (si está conectado).
     */
    @Transactional
    public NotificacionDTO crear(Long usuarioId, TipoNotificacion tipo, String titulo,
                                 String mensaje, String urlDestino, Map<String, Object> datos,
                                 boolean pushEnVivo) {
        Notificacion n = Notificacion.builder()
                .usuarioId(usuarioId)
                .tipo(tipo)
                .titulo(titulo)
                .mensaje(mensaje)
                .urlDestino(urlDestino)
                .datos(datos != null ? datos : new HashMap<>())
                .leida(false)
                .build();
        Notificacion guardado = repo.save(n);
        NotificacionDTO dto = NotificacionDTO.from(guardado);

        if (pushEnVivo) {
            try {
                messagingTemplate.convertAndSend(PREFIJO_DESTINO + usuarioId, dto);
            } catch (Exception e) {
                // No fallar la transacción si el push WS falla; la notif ya está persistida.
                log.warn("Fallo al pushear notificación userId={} id={}: {}",
                        usuarioId, guardado.getId(), e.getMessage());
            }
        }
        return dto;
    }

    /** Atajo para creación rápida con campos mínimos. */
    public NotificacionDTO crear(Long usuarioId, TipoNotificacion tipo, String titulo, String mensaje) {
        return crear(usuarioId, tipo, titulo, mensaje, null, null, true);
    }
}
