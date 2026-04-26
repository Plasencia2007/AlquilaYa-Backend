package com.plasencia.servicio_mensajeria.services;

import com.plasencia.servicio_mensajeria.clients.UsuariosClient;
import com.plasencia.servicio_mensajeria.config.CurrentUser;
import com.plasencia.servicio_mensajeria.dto.CrearMensajeRequest;
import com.plasencia.servicio_mensajeria.dto.MensajeDTO;
import com.plasencia.servicio_mensajeria.dto.UsuarioPerfilDTO;
import com.plasencia.servicio_mensajeria.entities.Conversacion;
import com.plasencia.servicio_mensajeria.entities.Mensaje;
import com.plasencia.servicio_mensajeria.enums.EstadoConversacion;
import com.plasencia.servicio_mensajeria.enums.EstadoMensaje;
import com.plasencia.servicio_mensajeria.enums.RolEmisor;
import com.plasencia.servicio_mensajeria.enums.TipoNotificacion;
import com.plasencia.servicio_mensajeria.repositories.MensajeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Envío/listado de mensajes. Se invoca desde REST y WebSocket — la autorización
 * de participación siempre se delega a {@link ConversacionService#verificarAcceso}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MensajeService {

    private final MensajeRepository mensajeRepo;
    private final ConversacionService conversacionService;
    private final WebSocketNotificationService wsNotify;
    private final NotificacionService notificacionService;
    private final UsuariosClient usuariosClient;

    /**
     * Envía un mensaje en nombre del caller. Persiste + emite por WebSocket a los dos
     * participantes. Retorna el DTO para responder en REST.
     */
    @Transactional
    public MensajeDTO enviar(Long conversacionId, CrearMensajeRequest req, CurrentUser user) {
        Conversacion c = conversacionService.verificarAcceso(conversacionId, user);

        if (c.getEstado() == EstadoConversacion.SUSPENDIDA) {
            throw new IllegalStateException("La conversación está suspendida por moderación");
        }
        if (user == null || user.getPerfilId() == null) {
            throw new IllegalStateException("Usuario sin perfil");
        }
        // Admin puede leer pero NO emitir como "estudiante" o "arrendador".
        RolEmisor rolEmisor;
        if (user.getPerfilId().equals(c.getEstudianteId())) {
            rolEmisor = RolEmisor.ESTUDIANTE;
        } else if (user.getPerfilId().equals(c.getArrendadorId())) {
            rolEmisor = RolEmisor.ARRENDADOR;
        } else {
            // Caller es ADMIN u otro rol sin participación: no puede enviar.
            throw new IllegalStateException("Solo los participantes pueden enviar mensajes");
        }

        LocalDateTime now = LocalDateTime.now();
        Mensaje msg = Mensaje.builder()
                .conversacion(c)
                .emisorPerfilId(user.getPerfilId())
                .emisorRol(rolEmisor)
                .contenido(req.getContenido())
                .estado(EstadoMensaje.ENVIADO)
                .fechaEnvio(now)
                .build();
        Mensaje saved = mensajeRepo.save(msg);

        conversacionService.actualizarTrasEnvio(c, req.getContenido(), now);

        MensajeDTO dto = MensajeDTO.from(saved);
        // Emitimos al userId de cada participante. Nota: tenemos los perfilIds; para el
        // Principal del WebSocket usamos userId (del JWT). En un sistema grande cachearíamos
        // perfilId -> userId. Por simplicidad, aquí usamos perfilId directamente como clave
        // del Principal — el frontend se identifica con el mismo valor. Si el mapping fuera
        // necesario, ConversacionService puede enriquecer con los userIds reales.
        wsNotify.enviarAParticipantes(c, c.getEstudianteId(), c.getArrendadorId(), dto);

        // Notificación in-app al receptor (no al emisor). Best-effort: si Feign falla,
        // el mensaje ya se entregó por WebSocket; la notif se pierde silenciosamente.
        try {
            crearNotificacionMensajeNuevo(c, rolEmisor, user.getPerfilId());
        } catch (Exception e) {
            log.warn("No se pudo crear notif de mensaje nuevo conv={}: {}", c.getId(), e.getMessage());
        }

        return dto;
    }

    /**
     * Crea una notificación in-app para el participante que NO es el emisor.
     * Resolvemos perfilId → userId vía Feign a servicio-usuarios.
     */
    private void crearNotificacionMensajeNuevo(Conversacion c, RolEmisor rolEmisor, Long emisorPerfilId) {
        Long receptorPerfilId;
        Long receptorUserId;
        String emisorNombre;
        String url;

        if (rolEmisor == RolEmisor.ESTUDIANTE) {
            receptorPerfilId = c.getArrendadorId();
            UsuarioPerfilDTO emisor = usuariosClient.obtenerEstudiante(emisorPerfilId);
            UsuarioPerfilDTO receptor = usuariosClient.obtenerArrendador(receptorPerfilId);
            emisorNombre = emisor != null && emisor.getNombre() != null ? emisor.getNombre() : "Un estudiante";
            receptorUserId = receptor != null ? receptor.getUsuarioId() : null;
            url = "/landlord/messages/students";
        } else {
            receptorPerfilId = c.getEstudianteId();
            UsuarioPerfilDTO emisor = usuariosClient.obtenerArrendador(emisorPerfilId);
            UsuarioPerfilDTO receptor = usuariosClient.obtenerEstudiante(receptorPerfilId);
            emisorNombre = emisor != null && emisor.getNombre() != null ? emisor.getNombre() : "El arrendador";
            receptorUserId = receptor != null ? receptor.getUsuarioId() : null;
            url = "/student/messages/" + c.getId();
        }

        if (receptorUserId == null) return;

        Map<String, Object> datos = new HashMap<>();
        datos.put("conversacionId", c.getId());
        datos.put("propiedadId", c.getPropiedadId());

        notificacionService.crear(receptorUserId, TipoNotificacion.MENSAJE_NUEVO,
                "Nuevo mensaje de " + emisorNombre,
                "Tienes un mensaje nuevo en tu conversación.",
                url, datos, true);
    }

    @Transactional(readOnly = true)
    public Page<MensajeDTO> listarVisibles(Long conversacionId, CurrentUser user, Pageable pageable) {
        conversacionService.verificarAcceso(conversacionId, user);
        Page<Mensaje> page;
        if (user != null && "ADMIN".equalsIgnoreCase(user.getRol())) {
            page = mensajeRepo.findByConversacionIdOrderByFechaEnvioAsc(conversacionId, pageable);
        } else {
            page = mensajeRepo.findByConversacionIdAndEstadoNotOrderByFechaEnvioAsc(
                    conversacionId, EstadoMensaje.BLOQUEADO, pageable);
        }
        return page.map(MensajeDTO::from);
    }

    /** Vista completa para admin (incluye BLOQUEADO). */
    @Transactional(readOnly = true)
    public Page<MensajeDTO> listarParaAdmin(Long conversacionId, Pageable pageable) {
        return mensajeRepo.findByConversacionIdOrderByFechaEnvioAsc(conversacionId, pageable)
                .map(MensajeDTO::from);
    }

    @Transactional
    public int marcarLeidos(Long conversacionId, CurrentUser user) {
        Conversacion c = conversacionService.verificarAcceso(conversacionId, user);
        if (user == null || user.getPerfilId() == null) return 0;
        // Admin no marca nada (no es destinatario real).
        if ("ADMIN".equalsIgnoreCase(user.getRol())) return 0;

        int actualizados = mensajeRepo.marcarLeidos(c.getId(), user.getPerfilId(), LocalDateTime.now());
        if (actualizados > 0) {
            wsNotify.enviarEventoAParticipantes(c, c.getEstudianteId(), c.getArrendadorId(),
                    new EventoLectura(c.getId(), user.getPerfilId(), actualizados));
        }
        return actualizados;
    }

    // Evento simple de lectura (tipo interno serializable por Jackson).
    public record EventoLectura(Long conversacionId, Long lectorPerfilId, int mensajes) {
        public String getTipo() { return "MENSAJES_LEIDOS"; }
    }

    public Mensaje obtener(Long id) {
        return mensajeRepo.findById(id)
                .orElseThrow(() -> new java.util.NoSuchElementException("Mensaje " + id + " no existe"));
    }

    @Transactional
    public Mensaje cambiarEstadoMensaje(Long mensajeId, EstadoMensaje nuevoEstado) {
        Mensaje m = obtener(mensajeId);
        m.setEstado(nuevoEstado);
        return mensajeRepo.save(m);
    }

    /**
     * Verifica que el usuario sea participante de la conversación y devuelve
     * la entidad. Usado por handlers WebSocket que necesitan validar acceso
     * antes de hacer broadcast (ej. typing).
     */
    @Transactional(readOnly = true)
    public Conversacion verificarAccesoEnviar(Long conversacionId, CurrentUser user) {
        return conversacionService.verificarAcceso(conversacionId, user);
    }

    /**
     * Broadcast de un evento (no-mensaje) a los participantes de la conversación.
     * Usado para typing indicators y otros eventos efímeros.
     */
    public void broadcastEventoConversacion(Conversacion c, Object evento) {
        wsNotify.enviarEventoAParticipantes(c, c.getEstudianteId(), c.getArrendadorId(), evento);
    }
}
