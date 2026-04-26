package com.plasencia.servicio_mensajeria.services;

import com.plasencia.servicio_mensajeria.clients.PropiedadesClient;
import com.plasencia.servicio_mensajeria.clients.UsuariosClient;
import com.plasencia.servicio_mensajeria.config.CurrentUser;
import com.plasencia.servicio_mensajeria.dto.ConversacionAdminDTO;
import com.plasencia.servicio_mensajeria.dto.ConversacionResumenDTO;
import com.plasencia.servicio_mensajeria.dto.CrearConversacionRequest;
import com.plasencia.servicio_mensajeria.dto.PropiedadResumenDTO;
import com.plasencia.servicio_mensajeria.dto.UsuarioPerfilDTO;
import com.plasencia.servicio_mensajeria.entities.Conversacion;
import com.plasencia.servicio_mensajeria.enums.EstadoConversacion;
import com.plasencia.servicio_mensajeria.enums.EstadoMensaje;
import com.plasencia.servicio_mensajeria.repositories.ConversacionRepository;
import com.plasencia.servicio_mensajeria.repositories.MensajeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Núcleo de autorización del chat: el método {@link #verificarAcceso(Long, CurrentUser)}
 * se invoca desde todos los flujos REST y WebSocket antes de leer/escribir.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConversacionService {

    private final ConversacionRepository conversacionRepo;
    private final MensajeRepository mensajeRepo;
    private final UsuariosClient usuariosClient;
    private final PropiedadesClient propiedadesClient;

    // =========================================================================
    //  Autorización
    // =========================================================================

    /**
     * Comprueba que el caller es ADMIN o uno de los dos participantes de la conversación.
     * Retorna la conversación cargada (evita segundo findById en el caller).
     */
    public Conversacion verificarAcceso(Long conversacionId, CurrentUser user) {
        if (user == null) {
            throw new AccessDeniedException("Sin contexto de usuario");
        }
        Conversacion c = conversacionRepo.findById(conversacionId)
                .orElseThrow(() -> new NoSuchElementException("Conversación " + conversacionId + " no existe"));

        if ("ADMIN".equalsIgnoreCase(user.getRol())) {
            return c;
        }
        Long perfil = user.getPerfilId();
        if (perfil == null) {
            throw new AccessDeniedException("Usuario sin perfil");
        }
        boolean esEstudiante = perfil.equals(c.getEstudianteId()) && "ESTUDIANTE".equalsIgnoreCase(user.getRol());
        boolean esArrendador = perfil.equals(c.getArrendadorId()) && "ARRENDADOR".equalsIgnoreCase(user.getRol());
        if (!esEstudiante && !esArrendador) {
            throw new AccessDeniedException("No participas en esta conversación");
        }
        return c;
    }

    // =========================================================================
    //  Creación idempotente
    // =========================================================================

    /**
     * Crea la conversación si no existe la tupla (estudianteId, arrendadorId, propiedadId),
     * o devuelve la existente. El rol del caller determina quién es estudiante y quién
     * arrendador en la tupla.
     */
    @Transactional
    public Conversacion crearOObtener(CrearConversacionRequest req, CurrentUser user) {
        if (user == null || user.getPerfilId() == null) {
            throw new AccessDeniedException("Usuario sin perfil para crear conversación");
        }
        Long estudianteId;
        Long arrendadorId;
        if ("ESTUDIANTE".equalsIgnoreCase(user.getRol())) {
            estudianteId = user.getPerfilId();
            arrendadorId = req.getContraparteId();
        } else if ("ARRENDADOR".equalsIgnoreCase(user.getRol())) {
            estudianteId = req.getContraparteId();
            arrendadorId = user.getPerfilId();
        } else {
            throw new AccessDeniedException("Solo estudiantes o arrendadores pueden iniciar conversaciones");
        }
        return conversacionRepo
                .findByEstudianteIdAndArrendadorIdAndPropiedadId(estudianteId, arrendadorId, req.getPropiedadId())
                .orElseGet(() -> {
                    Conversacion nueva = Conversacion.builder()
                            .estudianteId(estudianteId)
                            .arrendadorId(arrendadorId)
                            .propiedadId(req.getPropiedadId())
                            .estado(EstadoConversacion.ACTIVA)
                            .build();
                    Conversacion saved = conversacionRepo.save(nueva);
                    log.info("Conversación creada id={} estud={} arrend={} prop={}",
                            saved.getId(), estudianteId, arrendadorId, req.getPropiedadId());
                    return saved;
                });
    }

    /** Indica si la conversación ya existía antes de la operación (para decidir 200 vs 201). */
    @Transactional(readOnly = true)
    public boolean yaExistia(CrearConversacionRequest req, CurrentUser user) {
        if (user == null || user.getPerfilId() == null) return false;
        Long estudianteId;
        Long arrendadorId;
        if ("ESTUDIANTE".equalsIgnoreCase(user.getRol())) {
            estudianteId = user.getPerfilId();
            arrendadorId = req.getContraparteId();
        } else if ("ARRENDADOR".equalsIgnoreCase(user.getRol())) {
            estudianteId = req.getContraparteId();
            arrendadorId = user.getPerfilId();
        } else {
            return false;
        }
        return conversacionRepo
                .findByEstudianteIdAndArrendadorIdAndPropiedadId(estudianteId, arrendadorId, req.getPropiedadId())
                .isPresent();
    }

    // =========================================================================
    //  Listados
    // =========================================================================

    @Transactional(readOnly = true)
    public List<ConversacionResumenDTO> listarDelUsuario(CurrentUser user) {
        if (user == null || user.getPerfilId() == null) {
            return List.of();
        }
        List<Conversacion> conversaciones = conversacionRepo.findDelParticipante(user.getPerfilId());
        return conversaciones.stream().map(c -> toResumen(c, user)).toList();
    }

    @Transactional(readOnly = true)
    public Page<ConversacionAdminDTO> listarParaAdmin(EstadoConversacion estado, Long estudianteId,
                                                       Long arrendadorId, Long propiedadId, Pageable pageable) {
        Page<Conversacion> page = conversacionRepo.buscarParaAdmin(estado, estudianteId, arrendadorId, propiedadId, pageable);
        return page.map(this::toAdmin);
    }

    // =========================================================================
    //  Helpers de enriquecimiento (Feign con fallback)
    // =========================================================================

    private ConversacionResumenDTO toResumen(Conversacion c, CurrentUser user) {
        boolean soyEstudiante = user.getPerfilId().equals(c.getEstudianteId());
        Long contraparteId = soyEstudiante ? c.getArrendadorId() : c.getEstudianteId();
        String contraparteRol = soyEstudiante ? "ARRENDADOR" : "ESTUDIANTE";
        UsuarioPerfilDTO contraparte = soyEstudiante
                ? usuariosClient.obtenerArrendador(contraparteId)
                : usuariosClient.obtenerEstudiante(contraparteId);

        PropiedadResumenDTO prop = propiedadesClient.obtenerPropiedad(c.getPropiedadId());

        long noLeidos = mensajeRepo.countByConversacionIdAndEmisorPerfilIdNotAndEstado(
                c.getId(), user.getPerfilId(), EstadoMensaje.ENVIADO);

        return ConversacionResumenDTO.builder()
                .id(c.getId())
                .contraparteId(contraparteId)
                .contraparteNombre(nombreCompleto(contraparte))
                .contraparteRol(contraparteRol)
                .propiedadId(c.getPropiedadId())
                .propiedadTitulo(prop != null ? prop.getTitulo() : null)
                .estado(c.getEstado())
                .fechaUltimaActividad(c.getFechaUltimaActividad())
                .ultimoMensajePreview(c.getUltimoMensajePreview())
                .noLeidos(noLeidos)
                .build();
    }

    private ConversacionAdminDTO toAdmin(Conversacion c) {
        UsuarioPerfilDTO est = usuariosClient.obtenerEstudiante(c.getEstudianteId());
        UsuarioPerfilDTO arr = usuariosClient.obtenerArrendador(c.getArrendadorId());
        PropiedadResumenDTO prop = propiedadesClient.obtenerPropiedad(c.getPropiedadId());
        return ConversacionAdminDTO.builder()
                .id(c.getId())
                .estudianteId(c.getEstudianteId())
                .estudianteNombre(nombreCompleto(est))
                .arrendadorId(c.getArrendadorId())
                .arrendadorNombre(nombreCompleto(arr))
                .propiedadId(c.getPropiedadId())
                .propiedadTitulo(prop != null ? prop.getTitulo() : null)
                .estado(c.getEstado())
                .fechaCreacion(c.getFechaCreacion())
                .fechaUltimaActividad(c.getFechaUltimaActividad())
                .ultimoMensajePreview(c.getUltimoMensajePreview())
                .build();
    }

    private String nombreCompleto(UsuarioPerfilDTO u) {
        if (u == null) return null;
        String nombre = u.getNombre() != null ? u.getNombre() : "";
        String apellido = u.getApellido() != null ? u.getApellido() : "";
        return (nombre + " " + apellido).trim();
    }

    // =========================================================================
    //  Operaciones usadas desde otros servicios
    // =========================================================================

    /**
     * Actualiza la conversación tras un envío de mensaje: preview y fecha de actividad.
     */
    @Transactional
    public void actualizarTrasEnvio(Conversacion c, String contenido, LocalDateTime fecha) {
        c.setFechaUltimaActividad(fecha);
        c.setUltimoMensajePreview(trimPreview(contenido));
        conversacionRepo.save(c);
    }

    private String trimPreview(String contenido) {
        if (contenido == null) return null;
        return contenido.length() <= 200 ? contenido : contenido.substring(0, 200);
    }

    /** Cambia estado (usado por ModeracionService). */
    @Transactional
    public Conversacion cambiarEstado(Long conversacionId, EstadoConversacion nuevo) {
        Conversacion c = conversacionRepo.findById(conversacionId)
                .orElseThrow(() -> new NoSuchElementException("Conversación " + conversacionId + " no existe"));
        c.setEstado(nuevo);
        c.setFechaUltimaActividad(LocalDateTime.now());
        return conversacionRepo.save(c);
    }

    public Conversacion obtener(Long id) {
        return conversacionRepo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Conversación " + id + " no existe"));
    }
}
