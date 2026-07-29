package com.alquilaya.servicio_mensajeria.services;

import com.alquilaya.servicio_mensajeria.clients.UsuariosClient;
import com.alquilaya.servicio_mensajeria.config.CurrentUser;
import com.alquilaya.servicio_mensajeria.dto.NotificacionDTO;
import com.alquilaya.servicio_mensajeria.dto.PreferenciasNotificacionDTO;
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
    // Item 210 (enforcement real): consulta la preferencia del destinatario antes de crear+pushear.
    private final UsuariosClient usuariosClient;

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
     *
     * <p>Ítem 210: es el ÚNICO punto por el que pasan TODAS las notificaciones del sistema
     * (Kafka consumers de pagos/reservas/aprobación de usuarios + {@code MensajeService} para
     * chat), así que la preferencia del destinatario se aplica acá y no en cada productor.
     * Si la categoría de {@code tipo} está deshabilitada, la notificación NI SIQUIERA se
     * persiste (no solo se omite el push) — devuelve {@code null}, que ningún caller actual
     * usa (todas las llamadas existentes descartan el valor de retorno).</p>
     */
    @Transactional
    public NotificacionDTO crear(Long usuarioId, TipoNotificacion tipo, String titulo,
                                 String mensaje, String urlDestino, Map<String, Object> datos,
                                 boolean pushEnVivo) {
        if (!debeNotificar(usuarioId, tipo)) {
            log.debug("Notificación tipo={} para usuarioId={} suprimida por preferencia del usuario", tipo, usuarioId);
            return null;
        }
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

    /**
     * Ítem 210: true si el destinatario debe recibir este tipo de notificación. Las
     * categorías sin opt-out (cuenta/seguridad: documentos, bienvenida, sistema) siempre
     * devuelven true — no son togglable. Fail-open ante cualquier error resolviendo la
     * preferencia (Feign ya degrada solo vía {@code UsuariosClientFallback}, pero un catch
     * defensivo evita que un problema de preferencias tumbe una notificación transaccional).
     */
    private boolean debeNotificar(Long usuarioId, TipoNotificacion tipo) {
        Categoria categoria = categoriaDe(tipo);
        if (categoria == null || usuarioId == null) return true;
        try {
            PreferenciasNotificacionDTO prefs = usuariosClient.obtenerPreferenciasNotificacion(usuarioId);
            return switch (categoria) {
                case MENSAJES -> prefs.isNotificarMensajes();
                case RESERVAS -> prefs.isNotificarReservas();
                case MARKETING -> prefs.isNotificarMarketing();
            };
        } catch (Exception e) {
            log.warn("No se pudo resolver preferencias de notificación de usuarioId={}: {} — fail-open (se notifica)",
                    usuarioId, e.getMessage());
            return true;
        }
    }

    /**
     * Mapea cada {@link TipoNotificacion} real del catálogo a una categoría togglable (ítem
     * 210). MENSAJE_NUEVO es mensajes; las RESERVA_x y RECORDATORIO_PAGO son reservas;
     * ALERTA_ZONA (suscripción a nuevas propiedades, la única categoría "opt-in"/promocional
     * que existe hoy) es marketing. DOCUMENTO_x, BIENVENIDA y SISTEMA son notificaciones de
     * cuenta/seguridad y devuelven null (siempre se envían, sin preferencia que las apague).
     */
    private Categoria categoriaDe(TipoNotificacion tipo) {
        return switch (tipo) {
            case MENSAJE_NUEVO -> Categoria.MENSAJES;
            case RESERVA_APROBADA, RESERVA_RECHAZADA, RESERVA_PAGADA, RESERVA_CANCELADA, RECORDATORIO_PAGO ->
                    Categoria.RESERVAS;
            case ALERTA_ZONA -> Categoria.MARKETING;
            default -> null;
        };
    }

    private enum Categoria { MENSAJES, RESERVAS, MARKETING }
}
