package com.alquilaya.servicio_mensajeria.services;

import com.alquilaya.servicio_mensajeria.config.CurrentUser;
import com.alquilaya.servicio_mensajeria.dto.CrearMensajeRequest;
import com.alquilaya.servicio_mensajeria.dto.MensajeAdminDTO;
import com.alquilaya.servicio_mensajeria.dto.MensajeDTO;
import com.alquilaya.servicio_mensajeria.dto.UsuarioPerfilDTO;
import com.alquilaya.servicio_mensajeria.entities.Conversacion;
import com.alquilaya.servicio_mensajeria.entities.Mensaje;
import com.alquilaya.servicio_mensajeria.enums.EstadoConversacion;
import com.alquilaya.servicio_mensajeria.enums.EstadoMensaje;
import com.alquilaya.servicio_mensajeria.enums.RolEmisor;
import com.alquilaya.servicio_mensajeria.enums.TargetModeracion;
import com.alquilaya.servicio_mensajeria.enums.TipoConversacion;
import com.alquilaya.servicio_mensajeria.enums.TipoMensaje;
import com.alquilaya.servicio_mensajeria.enums.TipoNotificacion;
import com.alquilaya.servicio_mensajeria.repositories.MensajeRepository;
import com.alquilaya.servicio_mensajeria.repositories.ModeracionLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Envío/listado de mensajes. Se invoca desde REST y WebSocket — la autorización
 * de participación siempre se delega a {@link ConversacionService#verificarAcceso}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MensajeService {

    /** Ítem 254: preview legible cuando un mensaje IMAGEN no trae texto propio. */
    private static final String CONTENIDO_FALLBACK_IMAGEN = "📷 Imagen";

    private final MensajeRepository mensajeRepo;
    private final ConversacionService conversacionService;
    private final WebSocketNotificationService wsNotify;
    private final NotificacionService notificacionService;
    private final RateLimiterService rateLimiterService;
    private final ModeracionLogRepository moderacionLogRepo;

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

        // Rate limiting anti-spam: 60 mensajes por minuto por userId (no por perfilId,
        // así un mismo usuario no esquiva el límite con múltiples conversaciones).
        // Si Redis está caído, RateLimiterService permite el envío (graceful degradation).
        if (!rateLimiterService.tryAcquire(user.getUserId())) {
            throw new RateLimitExceededException(
                    "Has enviado demasiados mensajes en poco tiempo. Espera un momento antes de continuar.");
        }
        // El rol del emisor se toma del JWT, NO del perfilId: perfilId no es único
        // entre roles (un arrendador y un estudiante pueden compartir el mismo id
        // numérico, son tablas distintas). verificarAcceso() ya confirmó que el caller
        // es participante con ese rol, así que aquí basta con mapear su rol.
        // Admin puede leer pero NO emitir como "estudiante" o "arrendador".
        RolEmisor rolEmisor;
        if ("ARRENDADOR".equalsIgnoreCase(user.getRol())) {
            rolEmisor = RolEmisor.ARRENDADOR;
        } else if ("ESTUDIANTE".equalsIgnoreCase(user.getRol())) {
            rolEmisor = RolEmisor.ESTUDIANTE;
        } else {
            // Caller es ADMIN u otro rol sin participación: no puede enviar.
            throw new IllegalStateException("Solo los participantes pueden enviar mensajes");
        }

        // Ítem 254: tipo TEXTO/IMAGEN + validación condicional (bean-validation no puede
        // expresar "contenido requerido solo si tipo=TEXTO" de forma simple, así que se
        // resuelve aquí). Si tipo viene null desde el cliente, se trata como TEXTO.
        TipoMensaje tipo = req.getTipo() != null ? req.getTipo() : TipoMensaje.TEXTO;
        String contenidoResuelto;
        String urlAdjunto = null;
        if (tipo == TipoMensaje.IMAGEN) {
            if (req.getUrlAdjunto() == null || req.getUrlAdjunto().isBlank()) {
                throw new IllegalArgumentException("urlAdjunto es obligatorio para mensajes de tipo IMAGEN");
            }
            urlAdjunto = req.getUrlAdjunto();
            // Sin texto propio: fallback legible para que ultimoMensajePreview no quede vacío.
            contenidoResuelto = (req.getContenido() == null || req.getContenido().isBlank())
                    ? CONTENIDO_FALLBACK_IMAGEN
                    : req.getContenido();
        } else {
            if (req.getContenido() == null || req.getContenido().isBlank()) {
                throw new IllegalArgumentException("El contenido no puede estar vacío");
            }
            contenidoResuelto = req.getContenido();
        }

        LocalDateTime now = LocalDateTime.now();
        Mensaje msg = Mensaje.builder()
                .conversacion(c)
                .emisorPerfilId(user.getPerfilId())
                .emisorRol(rolEmisor)
                .contenido(contenidoResuelto)
                .tipo(tipo)
                .urlAdjunto(urlAdjunto)
                .estado(EstadoMensaje.ENVIADO)
                .fechaEnvio(now)
                .build();
        Mensaje saved = mensajeRepo.save(msg);

        conversacionService.actualizarTrasEnvio(c, contenidoResuelto, now);
        // Si el receptor había ocultado la conversación, que reaparezca en su lista.
        conversacionService.desocultarParaContraparte(c.getId(), user.getPerfilId(), rolEmisor);

        MensajeDTO dto = MensajeDTO.from(saved);
        // Emitimos al userId de cada participante. Nota: tenemos los perfilIds; para el
        // Principal del WebSocket usamos userId (del JWT). En un sistema grande cachearíamos
        // perfilId -> userId. Por simplicidad, aquí usamos perfilId directamente como clave
        // del Principal — el frontend se identifica con el mismo valor. Si el mapping fuera
        // necesario, ConversacionService puede enriquecer con los userIds reales.
        wsNotify.enviarAParticipantes(c, c.getEstudianteId(), c.getSegundoParticipanteId(), dto);

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

        if (c.getTipo() == TipoConversacion.ROOMMATE) {
            receptorPerfilId = emisorPerfilId.equals(c.getEstudianteId()) ? c.getEstudiante2Id() : c.getEstudianteId();
            UsuarioPerfilDTO emisor = conversacionService.obtenerEstudianteResiliente(emisorPerfilId).join();
            UsuarioPerfilDTO receptor = conversacionService.obtenerEstudianteResiliente(receptorPerfilId).join();
            emisorNombre = emisor != null && emisor.getNombre() != null ? emisor.getNombre() : "Un compañero";
            receptorUserId = receptor != null ? receptor.getUsuarioId() : null;
            url = "/student/messages/" + c.getId();
        } else if (rolEmisor == RolEmisor.ESTUDIANTE) {
            receptorPerfilId = c.getArrendadorId();
            UsuarioPerfilDTO emisor = conversacionService.obtenerEstudianteResiliente(emisorPerfilId).join();
            UsuarioPerfilDTO receptor = conversacionService.obtenerArrendadorResiliente(receptorPerfilId).join();
            emisorNombre = emisor != null && emisor.getNombre() != null ? emisor.getNombre() : "Un estudiante";
            receptorUserId = receptor != null ? receptor.getUsuarioId() : null;
            url = "/landlord/messages/students";
        } else {
            receptorPerfilId = c.getEstudianteId();
            UsuarioPerfilDTO emisor = conversacionService.obtenerArrendadorResiliente(emisorPerfilId).join();
            UsuarioPerfilDTO receptor = conversacionService.obtenerEstudianteResiliente(receptorPerfilId).join();
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

    /**
     * Página 0 = mensajes más recientes (DESC en BD), pero el contenido de cada
     * página se devuelve en orden cronológico ascendente — listo para pintar de
     * arriba hacia abajo sin que el frontend tenga que invertir nada. "Cargar más"
     * (scroll hacia arriba) simplemente pide page+1.
     */
    @Transactional(readOnly = true)
    public Page<MensajeDTO> listarVisibles(Long conversacionId, CurrentUser user, Pageable pageable) {
        conversacionService.verificarAcceso(conversacionId, user);
        Page<Mensaje> page;
        if (user != null && "ADMIN".equalsIgnoreCase(user.getRol())) {
            page = mensajeRepo.findByConversacionIdOrderByFechaEnvioDesc(conversacionId, pageable);
        } else {
            page = mensajeRepo.findByConversacionIdAndEstadoNotOrderByFechaEnvioDesc(
                    conversacionId, EstadoMensaje.BLOQUEADO, pageable);
        }
        return invertirContenido(page).map(MensajeDTO::from);
    }

    /**
     * Vista completa para admin (incluye BLOQUEADO). Mismo criterio: página 0 = más reciente.
     * A diferencia de {@link #listarVisibles}, resuelve el nombre del remitente y —para
     * mensajes bloqueados— el motivo del último log de moderación. Los nombres se resuelven
     * UNA vez por conversación (hay a lo más dos participantes), no por mensaje.
     */
    @Transactional(readOnly = true)
    public Page<MensajeAdminDTO> listarParaAdmin(Long conversacionId, Pageable pageable) {
        Conversacion c = conversacionService.obtener(conversacionId);
        Page<Mensaje> page = mensajeRepo.findByConversacionIdOrderByFechaEnvioDesc(conversacionId, pageable);

        Map<Long, String> nombrePorPerfil = new HashMap<>();
        if (c.getTipo() == TipoConversacion.ROOMMATE) {
            nombrePorPerfil.put(c.getEstudianteId(), nombreDe(conversacionService.obtenerEstudianteResiliente(c.getEstudianteId())));
            if (c.getEstudiante2Id() != null) {
                nombrePorPerfil.put(c.getEstudiante2Id(), nombreDe(conversacionService.obtenerEstudianteResiliente(c.getEstudiante2Id())));
            }
        } else {
            nombrePorPerfil.put(c.getEstudianteId(), nombreDe(conversacionService.obtenerEstudianteResiliente(c.getEstudianteId())));
            if (c.getArrendadorId() != null) {
                nombrePorPerfil.put(c.getArrendadorId(), nombreDe(conversacionService.obtenerArrendadorResiliente(c.getArrendadorId())));
            }
        }

        return invertirContenido(page).map(m -> MensajeAdminDTO.builder()
                .id(m.getId())
                .conversacionId(conversacionId)
                .remitenteId(m.getEmisorPerfilId())
                .remitenteNombre(nombrePorPerfil.getOrDefault(m.getEmisorPerfilId(), "Usuario"))
                .contenido(m.getContenido())
                .estado(m.getEstado())
                .fechaEnvio(m.getFechaEnvio())
                .motivoBloqueo(m.getEstado() == EstadoMensaje.BLOQUEADO ? motivoDelBloqueo(m.getId()) : null)
                .build());
    }

    private String nombreDe(java.util.concurrent.CompletableFuture<UsuarioPerfilDTO> fut) {
        UsuarioPerfilDTO u = fut.join();
        if (u == null) return "Usuario";
        String nombre = u.getNombre() != null ? u.getNombre() : "";
        String apellido = u.getApellido() != null ? u.getApellido() : "";
        String completo = (nombre + " " + apellido).trim();
        return completo.isEmpty() ? "Usuario" : completo;
    }

    private String motivoDelBloqueo(Long mensajeId) {
        return moderacionLogRepo.findFirstByTargetTypeAndTargetIdOrderByFechaDesc(TargetModeracion.MENSAJE, mensajeId)
                .map(log -> log.getMotivo())
                .orElse(null);
    }

    /** Invierte el orden de los mensajes DENTRO de la página (DESC->ASC), preservando paginación/total. */
    private Page<Mensaje> invertirContenido(Page<Mensaje> page) {
        List<Mensaje> contenido = new ArrayList<>(page.getContent());
        Collections.reverse(contenido);
        return new PageImpl<>(contenido, page.getPageable(), page.getTotalElements());
    }

    @Transactional
    public int marcarLeidos(Long conversacionId, CurrentUser user) {
        Conversacion c = conversacionService.verificarAcceso(conversacionId, user);
        if (user == null || user.getPerfilId() == null) return 0;
        // Admin no marca nada (no es destinatario real).
        if ("ADMIN".equalsIgnoreCase(user.getRol())) return 0;

        // El lector marca como leídos los mensajes que no son suyos, identificados por
        // emisorPerfilId (no por rol: en ROOMMATE ambos participantes son ESTUDIANTE).
        int actualizados = mensajeRepo.marcarLeidos(c.getId(), user.getPerfilId(), LocalDateTime.now());
        if (actualizados > 0) {
            wsNotify.enviarEventoAParticipantes(c, c.getEstudianteId(), c.getSegundoParticipanteId(),
                    new EventoLectura(c.getId(), user.getPerfilId(), user.getRol(), actualizados));
        }
        return actualizados;
    }

    // Evento simple de lectura (tipo interno serializable por Jackson).
    public record EventoLectura(Long conversacionId, Long lectorPerfilId, String lectorRol, int mensajes) {
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
        wsNotify.enviarEventoAParticipantes(c, c.getEstudianteId(), c.getSegundoParticipanteId(), evento);
    }
}
