package com.alquilaya.servicio_mensajeria.services;

import com.alquilaya.servicio_mensajeria.clients.PropiedadesClient;
import com.alquilaya.servicio_mensajeria.clients.UsuariosClient;
import com.alquilaya.servicio_mensajeria.config.CurrentUser;
import com.alquilaya.servicio_mensajeria.dto.ConversacionAdminDTO;
import com.alquilaya.servicio_mensajeria.dto.ConversacionResumenDTO;
import com.alquilaya.servicio_mensajeria.dto.CrearConversacionRequest;
import com.alquilaya.servicio_mensajeria.dto.ParticipanteConversacionDTO;
import com.alquilaya.servicio_mensajeria.dto.PropiedadResumenDTO;
import com.alquilaya.servicio_mensajeria.dto.UsuarioPerfilDTO;
import com.alquilaya.servicio_mensajeria.entities.Conversacion;
import com.alquilaya.servicio_mensajeria.entities.ConversacionOculta;
import com.alquilaya.servicio_mensajeria.entities.Mensaje;
import com.alquilaya.servicio_mensajeria.enums.EstadoConversacion;
import com.alquilaya.servicio_mensajeria.enums.EstadoMensaje;
import com.alquilaya.servicio_mensajeria.enums.RolEmisor;
import com.alquilaya.servicio_mensajeria.enums.TipoConversacion;
import com.alquilaya.servicio_mensajeria.repositories.ConversacionOcultaRepository;
import com.alquilaya.servicio_mensajeria.repositories.ConversacionRepository;
import com.alquilaya.servicio_mensajeria.repositories.MensajeRepository;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.concurrent.CompletableFuture;

/**
 * Núcleo de autorización del chat: el método {@link #verificarAcceso(Long, CurrentUser)}
 * se invoca desde todos los flujos REST y WebSocket antes de leer/escribir.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConversacionService {

    private final ConversacionRepository conversacionRepo;
    private final ConversacionOcultaRepository ocultaRepo;
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
        boolean esSegundoEstudiante = c.getEstudiante2Id() != null
                && perfil.equals(c.getEstudiante2Id()) && "ESTUDIANTE".equalsIgnoreCase(user.getRol());
        boolean esArrendador = c.getArrendadorId() != null
                && perfil.equals(c.getArrendadorId()) && "ARRENDADOR".equalsIgnoreCase(user.getRol());
        if (!esEstudiante && !esSegundoEstudiante && !esArrendador) {
            throw new AccessDeniedException("No participas en esta conversación");
        }
        return c;
    }

    // =========================================================================
    //  Creación idempotente
    // =========================================================================

    /**
     * Crea la conversación si no existe, o devuelve la existente. Con {@code tipo} omitido
     * o {@code ESTUDIANTE_ARRENDADOR} (default, compatibilidad con clientes existentes) usa
     * la tupla (estudianteId, arrendadorId, propiedadId), donde el rol del caller determina
     * quién es estudiante y quién arrendador. Con {@code ROOMMATE} crea una conversación
     * entre dos estudiantes, ver {@link #crearOObtenerRoommate}.
     */
    @Transactional
    public Conversacion crearOObtener(CrearConversacionRequest req, CurrentUser user) {
        if (user == null || user.getPerfilId() == null) {
            throw new AccessDeniedException("Usuario sin perfil para crear conversación");
        }
        if (req.getTipo() == TipoConversacion.ROOMMATE) {
            return crearOObtenerRoommate(req, user);
        }
        if (req.getPropiedadId() == null) {
            throw new IllegalArgumentException("propiedadId es obligatorio para conversaciones con un arrendador");
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
                            .tipo(TipoConversacion.ESTUDIANTE_ARRENDADOR)
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

    /**
     * Conversación roommate (estudiante↔estudiante): sin propiedad ni arrendador. La
     * pareja se guarda en orden canónico (menor, mayor) para que el índice único parcial
     * (estudiante_id, estudiante2_id) WHERE tipo='ROOMMATE' garantice idempotencia sin
     * importar cuál de los dos la inicia.
     */
    private Conversacion crearOObtenerRoommate(CrearConversacionRequest req, CurrentUser user) {
        if (!"ESTUDIANTE".equalsIgnoreCase(user.getRol())) {
            throw new AccessDeniedException("Solo estudiantes pueden iniciar conversaciones de roommates");
        }
        Long miId = user.getPerfilId();
        Long otroId = req.getContraparteId();
        if (otroId.equals(miId)) {
            throw new IllegalArgumentException("No puedes iniciar una conversación contigo mismo");
        }
        Long a = Math.min(miId, otroId);
        Long b = Math.max(miId, otroId);
        return conversacionRepo.findByEstudianteIdAndEstudiante2IdAndTipo(a, b, TipoConversacion.ROOMMATE)
                .orElseGet(() -> {
                    Conversacion nueva = Conversacion.builder()
                            .tipo(TipoConversacion.ROOMMATE)
                            .estudianteId(a)
                            .estudiante2Id(b)
                            .estado(EstadoConversacion.ACTIVA)
                            .build();
                    Conversacion saved = conversacionRepo.save(nueva);
                    log.info("Conversación roommate creada id={} entre estudiantes {} y {}", saved.getId(), a, b);
                    return saved;
                });
    }

    /** Indica si la conversación ya existía antes de la operación (para decidir 200 vs 201). */
    @Transactional(readOnly = true)
    public boolean yaExistia(CrearConversacionRequest req, CurrentUser user) {
        if (user == null || user.getPerfilId() == null) return false;
        if (req.getTipo() == TipoConversacion.ROOMMATE) {
            if (!"ESTUDIANTE".equalsIgnoreCase(user.getRol())) return false;
            Long miId = user.getPerfilId();
            Long otroId = req.getContraparteId();
            if (otroId == null || otroId.equals(miId)) return false;
            Long a = Math.min(miId, otroId);
            Long b = Math.max(miId, otroId);
            return conversacionRepo.findByEstudianteIdAndEstudiante2IdAndTipo(a, b, TipoConversacion.ROOMMATE)
                    .isPresent();
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
        RolEmisor rol = rolEmisorDelUser(user);
        // Si el rol del caller no es participante (p.ej. ADMIN), no hay lista personal.
        if (rol == null) return List.of();
        java.util.Set<Long> ocultas = new java.util.HashSet<>(
                ocultaRepo.findConversacionIdsOcultasPara(user.getPerfilId(), rol));
        List<Conversacion> conversaciones = conversacionRepo.findDelParticipante(user.getPerfilId(), user.getRol());
        return conversaciones.stream()
                .filter(c -> !ocultas.contains(c.getId()))
                .map(c -> toResumen(c, user))
                .toList();
    }

    /**
     * Ítem 262: lo INVERSO de {@link #listarDelUsuario} — solo las conversaciones que el
     * caller SÍ ocultó ("archivó"). Reutiliza {@link #toResumen} para no duplicar el
     * enriquecimiento (contraparte, preview, no-leídos, ultimoMensajeEsMio).
     */
    @Transactional(readOnly = true)
    public List<ConversacionResumenDTO> listarArchivadasDelUsuario(CurrentUser user) {
        if (user == null || user.getPerfilId() == null) {
            return List.of();
        }
        RolEmisor rol = rolEmisorDelUser(user);
        if (rol == null) return List.of();
        List<Long> archivadasIds = ocultaRepo.findConversacionIdsOcultasPara(user.getPerfilId(), rol);
        if (archivadasIds.isEmpty()) return List.of();
        // findAllById no garantiza el orden de la lista de ids: se reordena igual que
        // findDelParticipante (más reciente primero).
        return conversacionRepo.findAllById(archivadasIds).stream()
                .sorted(java.util.Comparator.comparing(Conversacion::getFechaUltimaActividad).reversed())
                .map(c -> toResumen(c, user))
                .toList();
    }

    /**
     * Ítem 264: versión paginada de {@link #listarDelUsuario}, para el endpoint nuevo y
     * separado {@code GET /conversaciones/paginadas}. A diferencia de listarDelUsuario,
     * no excluye las archivadas (el filtro en memoria rompería totalElements/totalPages
     * de la Page); quien necesite "mis conversaciones sin las archivadas" sigue usando
     * el endpoint sin paginar.
     */
    @Transactional(readOnly = true)
    public Page<ConversacionResumenDTO> listarDelUsuarioPaginado(CurrentUser user, Pageable pageable) {
        if (user == null || user.getPerfilId() == null || rolEmisorDelUser(user) == null) {
            return Page.empty(pageable);
        }
        Page<Conversacion> page = conversacionRepo.findDelParticipantePaginado(user.getPerfilId(), user.getRol(), pageable);
        return page.map(c -> toResumen(c, user));
    }

    /**
     * Marca la conversación como oculta para el caller (no afecta al otro participante).
     * Idempotente: llamar dos veces no rompe nada.
     */
    @Transactional
    public void ocultarParaUsuario(Long conversacionId, CurrentUser user) {
        Conversacion c = verificarAcceso(conversacionId, user);
        RolEmisor rol = rolEmisorDelUser(user);
        if (rol == null) {
            throw new AccessDeniedException("Solo los participantes pueden ocultar la conversación");
        }
        if (ocultaRepo.existsByConversacionIdAndPerfilIdAndRol(c.getId(), user.getPerfilId(), rol)) {
            return;
        }
        ocultaRepo.save(ConversacionOculta.builder()
                .conversacionId(c.getId())
                .perfilId(user.getPerfilId())
                .rol(rol)
                .build());
    }

    /**
     * Borra el "ocultamiento" del participante que NO es el emisor del mensaje,
     * para que la conversación reaparezca en su lista al recibir un mensaje nuevo.
     */
    @Transactional
    public void desocultarParaContraparte(Long conversacionId, Long emisorPerfilId, RolEmisor emisorRol) {
        if (emisorRol == null || emisorPerfilId == null) return;
        ocultaRepo.desocultarParaContraparte(conversacionId, emisorPerfilId, emisorRol);
    }

    private RolEmisor rolEmisorDelUser(CurrentUser user) {
        if (user == null || user.getRol() == null) return null;
        if ("ESTUDIANTE".equalsIgnoreCase(user.getRol())) return RolEmisor.ESTUDIANTE;
        if ("ARRENDADOR".equalsIgnoreCase(user.getRol())) return RolEmisor.ARRENDADOR;
        return null;
    }

    @Transactional(readOnly = true)
    public Page<ConversacionAdminDTO> listarParaAdmin(EstadoConversacion estado, Long estudianteId,
                                                       Long arrendadorId, Long propiedadId, String q,
                                                       Pageable pageable) {
        String qNormalizado = (q == null || q.isBlank()) ? null : q.trim();
        Page<Conversacion> page = conversacionRepo.buscarParaAdmin(
                estado, estudianteId, arrendadorId, propiedadId, qNormalizado, pageable);
        return page.map(this::toAdmin);
    }

    // =========================================================================
    //  Helpers de enriquecimiento (Feign con fallback)
    // =========================================================================

    private ConversacionResumenDTO toResumen(Conversacion c, CurrentUser user) {
        Long contraparteId;
        String contraparteRol;
        UsuarioPerfilDTO contraparte;
        String propiedadTitulo = null;

        if (c.getTipo() == TipoConversacion.ROOMMATE) {
            // Ambos participantes son ESTUDIANTE: la contraparte es "el otro" de los dos
            // ids guardados, identificado por perfilId (no hay rol que los distinga).
            contraparteId = user.getPerfilId().equals(c.getEstudianteId()) ? c.getEstudiante2Id() : c.getEstudianteId();
            contraparteRol = "ESTUDIANTE";
            contraparte = obtenerEstudianteResiliente(contraparteId).join();
        } else {
            // Quién es el caller dentro de la conversación se decide por ROL, no por
            // perfilId (que colisiona entre roles).
            boolean soyEstudiante = rolEmisorDelUser(user) == RolEmisor.ESTUDIANTE;
            contraparteId = soyEstudiante ? c.getArrendadorId() : c.getEstudianteId();
            contraparteRol = soyEstudiante ? "ARRENDADOR" : "ESTUDIANTE";
            contraparte = soyEstudiante
                    ? obtenerArrendadorResiliente(contraparteId).join()
                    : obtenerEstudianteResiliente(contraparteId).join();
            PropiedadResumenDTO prop = obtenerPropiedadResiliente(c.getPropiedadId()).join();
            propiedadTitulo = prop != null ? prop.getTitulo() : null;
        }

        // No-leídos = mensajes de la contraparte (identificada por perfilId, ver
        // MensajeRepository) aún en estado ENVIADO.
        long noLeidos = mensajeRepo.countByConversacionIdAndEmisorPerfilIdNotAndEstado(
                c.getId(), user.getPerfilId(), EstadoMensaje.ENVIADO);

        // Ítem 265: "Tú: …" — se calcula consultando el último mensaje REAL (en vez de
        // agregar un campo a Conversacion) para no depender de que MensajeService.enviar()
        // (de otro agente, no tocado aquí) pase un emisorPerfilId nuevo.
        List<Mensaje> ultimoMensaje = mensajeRepo.findTop1ByConversacionIdOrderByFechaEnvioDesc(c.getId());
        boolean ultimoMensajeEsMio = !ultimoMensaje.isEmpty()
                && user.getPerfilId().equals(ultimoMensaje.get(0).getEmisorPerfilId());

        return ConversacionResumenDTO.builder()
                .id(c.getId())
                .contraparteId(contraparteId)
                .contraparteNombre(nombreCompleto(contraparte))
                .contraparteRol(contraparteRol)
                .propiedadId(c.getPropiedadId())
                .propiedadTitulo(propiedadTitulo)
                .estado(c.getEstado())
                .fechaUltimaActividad(c.getFechaUltimaActividad())
                .ultimoMensajePreview(c.getUltimoMensajePreview())
                .noLeidos(noLeidos)
                .ultimoMensajeEsMio(ultimoMensajeEsMio)
                .build();
    }

    private ConversacionAdminDTO toAdmin(Conversacion c) {
        UsuarioPerfilDTO est = obtenerEstudianteResiliente(c.getEstudianteId()).join();
        PropiedadResumenDTO prop = c.getPropiedadId() != null
                ? obtenerPropiedadResiliente(c.getPropiedadId()).join() : null;

        if (c.getTipo() == TipoConversacion.ROOMMATE) {
            UsuarioPerfilDTO est2 = obtenerEstudianteResiliente(c.getEstudiante2Id()).join();
            List<ParticipanteConversacionDTO> participantes = List.of(
                    new ParticipanteConversacionDTO(c.getEstudianteId(), nombreCompleto(est), "ESTUDIANTE"),
                    new ParticipanteConversacionDTO(c.getEstudiante2Id(), nombreCompleto(est2), "ESTUDIANTE"));
            return ConversacionAdminDTO.builder()
                    .id(c.getId())
                    .tipo(c.getTipo())
                    .participantes(participantes)
                    .estudianteId(c.getEstudianteId())
                    .estudianteNombre(nombreCompleto(est))
                    .estudiante2Id(c.getEstudiante2Id())
                    .estudiante2Nombre(nombreCompleto(est2))
                    .estado(c.getEstado())
                    .fechaCreacion(c.getFechaCreacion())
                    .fechaUltimaActividad(c.getFechaUltimaActividad())
                    .ultimoMensajePreview(c.getUltimoMensajePreview())
                    .build();
        }
        UsuarioPerfilDTO arr = obtenerArrendadorResiliente(c.getArrendadorId()).join();
        List<ParticipanteConversacionDTO> participantes = List.of(
                new ParticipanteConversacionDTO(c.getEstudianteId(), nombreCompleto(est), "ESTUDIANTE"),
                new ParticipanteConversacionDTO(c.getArrendadorId(), nombreCompleto(arr), "ARRENDADOR"));
        return ConversacionAdminDTO.builder()
                .id(c.getId())
                .tipo(c.getTipo())
                .participantes(participantes)
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
    //  Métodos resilientes (Resilience4j: 5 patrones aplicados)
    // =========================================================================

    @TimeLimiter(name = "obtenerArrendadorMsgCB")
    @CircuitBreaker(name = "obtenerArrendadorMsgCB", fallbackMethod = "fallbackObtenerArrendador")
    @Retry(name = "obtenerArrendadorMsgCB")
    @Bulkhead(name = "obtenerArrendadorMsgCB", type = Bulkhead.Type.SEMAPHORE)
    public CompletableFuture<UsuarioPerfilDTO> obtenerArrendadorResiliente(Long perfilId) {
        log.info("[Resilience4j] Llamando a servicio-usuarios para arrendador {}", perfilId);
        var attrs = RequestContextHolder.getRequestAttributes();
        return CompletableFuture.supplyAsync(() -> {
            RequestContextHolder.setRequestAttributes(attrs);
            try {
                return usuariosClient.obtenerArrendador(perfilId);
            } catch (Exception e) {
                log.error("[FALLBACK LOCAL] obtenerArrendadorResiliente({}) — {}: {}",
                        perfilId, e.getClass().getSimpleName(), e.getMessage());
                UsuarioPerfilDTO defaultDto = new UsuarioPerfilDTO();
                defaultDto.setId(perfilId);
                defaultDto.setNombre("Arrendador");
                return defaultDto;
            } finally {
                RequestContextHolder.resetRequestAttributes();
            }
        });
    }

    @SuppressWarnings("unused")
    private CompletableFuture<UsuarioPerfilDTO> fallbackObtenerArrendador(Long perfilId, Throwable t) {
        log.error("[FALLBACK] obtenerArrendador({}) — {}: {}",
                perfilId, t.getClass().getSimpleName(), t.getMessage());
        UsuarioPerfilDTO defaultDto = new UsuarioPerfilDTO();
        defaultDto.setId(perfilId);
        defaultDto.setNombre("Arrendador");
        return CompletableFuture.completedFuture(defaultDto);
    }

    @TimeLimiter(name = "obtenerEstudianteMsgCB")
    @CircuitBreaker(name = "obtenerEstudianteMsgCB", fallbackMethod = "fallbackObtenerEstudiante")
    @Retry(name = "obtenerEstudianteMsgCB")
    @Bulkhead(name = "obtenerEstudianteMsgCB", type = Bulkhead.Type.SEMAPHORE)
    public CompletableFuture<UsuarioPerfilDTO> obtenerEstudianteResiliente(Long perfilId) {
        log.info("[Resilience4j] Llamando a servicio-usuarios para estudiante {}", perfilId);
        var attrs = RequestContextHolder.getRequestAttributes();
        return CompletableFuture.supplyAsync(() -> {
            RequestContextHolder.setRequestAttributes(attrs);
            try {
                return usuariosClient.obtenerEstudiante(perfilId);
            } catch (Exception e) {
                log.error("[FALLBACK LOCAL] obtenerEstudianteResiliente({}) — {}: {}",
                        perfilId, e.getClass().getSimpleName(), e.getMessage());
                UsuarioPerfilDTO defaultDto = new UsuarioPerfilDTO();
                defaultDto.setId(perfilId);
                defaultDto.setNombre("Estudiante");
                return defaultDto;
            } finally {
                RequestContextHolder.resetRequestAttributes();
            }
        });
    }

    @SuppressWarnings("unused")
    private CompletableFuture<UsuarioPerfilDTO> fallbackObtenerEstudiante(Long perfilId, Throwable t) {
        log.error("[FALLBACK] obtenerEstudiante({}) — {}: {}",
                perfilId, t.getClass().getSimpleName(), t.getMessage());
        UsuarioPerfilDTO defaultDto = new UsuarioPerfilDTO();
        defaultDto.setId(perfilId);
        defaultDto.setNombre("Estudiante");
        return CompletableFuture.completedFuture(defaultDto);
    }

    @TimeLimiter(name = "obtenerPropiedadMsgCB")
    @CircuitBreaker(name = "obtenerPropiedadMsgCB", fallbackMethod = "fallbackObtenerPropiedad")
    @Retry(name = "obtenerPropiedadMsgCB")
    @Bulkhead(name = "obtenerPropiedadMsgCB", type = Bulkhead.Type.SEMAPHORE)
    public CompletableFuture<PropiedadResumenDTO> obtenerPropiedadResiliente(Long propiedadId) {
        log.info("[Resilience4j] Llamando a servicio-propiedades para propiedad {}", propiedadId);
        var attrs = RequestContextHolder.getRequestAttributes();
        return CompletableFuture.supplyAsync(() -> {
            RequestContextHolder.setRequestAttributes(attrs);
            try {
                return propiedadesClient.obtenerPropiedad(propiedadId);
            } catch (Exception e) {
                log.error("[FALLBACK LOCAL] obtenerPropiedadResiliente({}) — {}: {}",
                        propiedadId, e.getClass().getSimpleName(), e.getMessage());
                PropiedadResumenDTO defaultDto = new PropiedadResumenDTO();
                defaultDto.setId(propiedadId);
                defaultDto.setTitulo("Propiedad #" + propiedadId);
                return defaultDto;
            } finally {
                RequestContextHolder.resetRequestAttributes();
            }
        });
    }

    @SuppressWarnings("unused")
    private CompletableFuture<PropiedadResumenDTO> fallbackObtenerPropiedad(Long propiedadId, Throwable t) {
        log.error("[FALLBACK] obtenerPropiedad({}) — {}: {}",
                propiedadId, t.getClass().getSimpleName(), t.getMessage());
        PropiedadResumenDTO defaultDto = new PropiedadResumenDTO();
        defaultDto.setId(propiedadId);
        defaultDto.setTitulo("Propiedad #" + propiedadId);
        return CompletableFuture.completedFuture(defaultDto);
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
