package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.clients.UsuariosClient;
import com.alquilaya.serviciopropiedades.config.CurrentUser;
import com.alquilaya.serviciopropiedades.dto.CrearResenaArrendadorRequest;
import com.alquilaya.serviciopropiedades.dto.CrearResenaPropiedadRequest;
import com.alquilaya.serviciopropiedades.dto.CrearResenaEstudianteRequest;
import com.alquilaya.serviciopropiedades.dto.EstudianteInfoDTO;
import com.alquilaya.serviciopropiedades.dto.ResenaResponseDTO;
import com.alquilaya.serviciopropiedades.dto.ResumenCategoriasDTO;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.entities.ResenaArrendador;
import com.alquilaya.serviciopropiedades.entities.ResenaEstudiante;
import com.alquilaya.serviciopropiedades.entities.ResenaPropiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.ResenaArrendadorRepository;
import com.alquilaya.serviciopropiedades.repositories.ResenaEstudianteRepository;
import com.alquilaya.serviciopropiedades.repositories.ResenaPropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResenaService {

    private final ResenaPropiedadRepository resenaPropRepo;
    private final ResenaArrendadorRepository resenaArrRepo;
    private final ResenaEstudianteRepository resenaEstRepo;
    private final ReservaRepository reservaRepository;
    private final PropiedadRepository propiedadRepository;
    private final UsuariosClient usuariosClient;
    private final KafkaProducerService kafkaProducerService;

    // ======================= PROPIEDAD =======================

    @Transactional
    public ResenaPropiedad resenarPropiedad(CrearResenaPropiedadRequest req, CurrentUser current) {
        Long estudianteId = validarEstudiante(current);

        boolean tieneReservaFinalizada = reservaRepository.existsByEstudianteIdAndPropiedadIdAndEstado(
                estudianteId, req.getPropiedadId(), EstadoReserva.FINALIZADA);
        if (!tieneReservaFinalizada) {
            throw new IllegalStateException("Solo puedes reseñar propiedades donde tu reserva esté FINALIZADA");
        }

        if (resenaPropRepo.existsByEstudianteIdAndPropiedadId(estudianteId, req.getPropiedadId())) {
            throw new IllegalStateException("Ya has reseñado esta propiedad");
        }

        ResenaPropiedad resena = ResenaPropiedad.builder()
                .propiedadId(req.getPropiedadId())
                .estudianteId(estudianteId)
                // El rating general es DERIVADO de las sub-categorías (fuente de verdad en el
                // servidor, no en el cliente). Si no vienen las 4, se respeta el rating enviado.
                .rating(calcularRatingGeneral(req))
                .ratingLimpieza(req.getRatingLimpieza())
                .ratingUbicacion(req.getRatingUbicacion())
                .ratingPrecio(req.getRatingPrecio())
                .ratingTrato(req.getRatingTrato())
                .comentario(req.getComentario())
                .visible(true)
                .build();
        ResenaPropiedad guardada = resenaPropRepo.save(resena);
        recalcularPropiedad(req.getPropiedadId());
        log.info("⭐ Reseña de propiedad {} creada por estudiante {} (rating={})",
                req.getPropiedadId(), estudianteId, req.getRating());
        return guardada;
    }

    public List<ResenaResponseDTO> listarPorPropiedad(Long propiedadId) {
        List<ResenaPropiedad> resenas = resenaPropRepo
                .findByPropiedadIdAndVisibleTrueOrderByFechaCreacionDesc(propiedadId);
        return mapearConNombresEstudiante(resenas, ResenaPropiedad::getEstudianteId,
                r -> ResenaResponseDTO.builder()
                        .id(r.getId())
                        .tipo("PROPIEDAD")
                        .targetId(r.getPropiedadId())
                        .estudianteId(r.getEstudianteId())
                        .rating(r.getRating())
                        .ratingLimpieza(r.getRatingLimpieza())
                        .ratingUbicacion(r.getRatingUbicacion())
                        .ratingPrecio(r.getRatingPrecio())
                        .ratingTrato(r.getRatingTrato())
                        .comentario(r.getComentario())
                        .respuestaArrendador(r.getRespuestaArrendador())
                        .fechaRespuesta(r.getFechaRespuesta())
                        .visible(r.getVisible())
                        .fechaCreacion(r.getFechaCreacion())
                        .build());
    }

    /**
     * El arrendador dueño de la propiedad responde (o edita/borra) públicamente una reseña.
     * Texto en blanco = borra la respuesta. Valida que el solicitante sea el arrendador dueño.
     */
    /** Máximo de caracteres de la respuesta del arrendador (igual que el comentario). */
    private static final int MAX_RESPUESTA = 2000;

    @Transactional
    public ResenaResponseDTO responderResenaPropiedad(Long resenaId, String respuesta, CurrentUser current) {
        Long arrendadorId = validarArrendador(current);
        ResenaPropiedad r = resenaPropRepo.findById(resenaId)
                .orElseThrow(() -> new IllegalArgumentException("No existe la reseña de propiedad " + resenaId));
        Propiedad propiedad = propiedadRepository.findById(r.getPropiedadId())
                .orElseThrow(() -> new IllegalArgumentException("No existe la propiedad de la reseña"));
        if (!arrendadorId.equals(propiedad.getArrendadorId())) {
            throw new IllegalStateException("Solo el arrendador dueño de la propiedad puede responder esta reseña");
        }
        String texto = respuesta != null ? respuesta.trim() : "";
        if (texto.length() > MAX_RESPUESTA) {
            throw new IllegalArgumentException("La respuesta no puede exceder " + MAX_RESPUESTA + " caracteres");
        }
        if (texto.isEmpty()) {
            r.setRespuestaArrendador(null);
            r.setFechaRespuesta(null);
        } else {
            r.setRespuestaArrendador(texto);
            r.setFechaRespuesta(java.time.LocalDateTime.now());
        }
        return mapPropiedad(resenaPropRepo.save(r));
    }

    /** Listado paginado de TODAS las reseñas de propiedad (incl. ocultas) para moderación admin. */
    public org.springframework.data.domain.Page<ResenaResponseDTO> listarPropiedadAdmin(int page, int size) {
        var pageable = org.springframework.data.domain.PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        return resenaPropRepo.findAllByOrderByFechaCreacionDesc(pageable).map(this::mapPropiedad);
    }

    /** Moderación: oculta/muestra una reseña de propiedad y recalcula el promedio. */
    @Transactional
    public ResenaResponseDTO cambiarVisibilidadPropiedad(Long resenaId, boolean visible) {
        ResenaPropiedad r = resenaPropRepo.findById(resenaId)
                .orElseThrow(() -> new IllegalArgumentException("No existe la reseña de propiedad " + resenaId));
        r.setVisible(visible);
        ResenaPropiedad guardada = resenaPropRepo.save(r);
        recalcularPropiedad(guardada.getPropiedadId());
        return mapPropiedad(guardada);
    }

    /** Moderación: el admin borra SOLO la respuesta del arrendador (la reseña queda intacta). */
    @Transactional
    public ResenaResponseDTO eliminarRespuestaPropiedad(Long resenaId) {
        ResenaPropiedad r = resenaPropRepo.findById(resenaId)
                .orElseThrow(() -> new IllegalArgumentException("No existe la reseña de propiedad " + resenaId));
        r.setRespuestaArrendador(null);
        r.setFechaRespuesta(null);
        return mapPropiedad(resenaPropRepo.save(r));
    }

    /** DTO de una reseña de propiedad (sin enriquecer con nombre de estudiante). */
    private ResenaResponseDTO mapPropiedad(ResenaPropiedad g) {
        return ResenaResponseDTO.builder()
                .id(g.getId()).tipo("PROPIEDAD").targetId(g.getPropiedadId())
                .estudianteId(g.getEstudianteId()).rating(g.getRating())
                .ratingLimpieza(g.getRatingLimpieza()).ratingUbicacion(g.getRatingUbicacion())
                .ratingPrecio(g.getRatingPrecio()).ratingTrato(g.getRatingTrato())
                .comentario(g.getComentario())
                .respuestaArrendador(g.getRespuestaArrendador()).fechaRespuesta(g.getFechaRespuesta())
                .visible(g.getVisible()).fechaCreacion(g.getFechaCreacion())
                .build();
    }

    /**
     * Rating general derivado: si vienen las 4 sub-categorías, es su promedio redondeado;
     * si no (formato legacy), se respeta el rating que envió el cliente.
     */
    private Integer calcularRatingGeneral(CrearResenaPropiedadRequest req) {
        Integer l = req.getRatingLimpieza();
        Integer u = req.getRatingUbicacion();
        Integer p = req.getRatingPrecio();
        Integer t = req.getRatingTrato();
        if (l != null && u != null && p != null && t != null) {
            return (int) Math.round((l + u + p + t) / 4.0);
        }
        return req.getRating();
    }

    /** Promedios por sub-categoría (limpieza/ubicación/precio/trato) de una propiedad. */
    public ResumenCategoriasDTO resumenCategorias(Long propiedadId) {
        List<Object[]> filas = resenaPropRepo.promediosCategorias(propiedadId);
        if (filas == null || filas.isEmpty() || filas.get(0) == null) {
            return ResumenCategoriasDTO.builder().build();
        }
        Object[] f = filas.get(0);
        return ResumenCategoriasDTO.builder()
                .limpieza(aDouble(f[0]))
                .ubicacion(aDouble(f[1]))
                .precio(aDouble(f[2]))
                .trato(aDouble(f[3]))
                .build();
    }

    private static Double aDouble(Object o) {
        return o instanceof Number n ? n.doubleValue() : null;
    }

    // ======================= ARRENDADOR =======================

    @Transactional
    public ResenaArrendador resenarArrendador(CrearResenaArrendadorRequest req, CurrentUser current) {
        Long estudianteId = validarEstudiante(current);

        // Requiere que exista al menos UNA reserva FINALIZADA del estudiante sobre ALGUNA propiedad de ese arrendador
        boolean puedeResenar = propiedadRepository.findByArrendadorId(req.getArrendadorId()).stream()
                .anyMatch(p -> reservaRepository.existsByEstudianteIdAndPropiedadIdAndEstado(
                        estudianteId, p.getId(), EstadoReserva.FINALIZADA));
        if (!puedeResenar) {
            throw new IllegalStateException("Solo puedes reseñar arrendadores con los que hayas tenido una reserva FINALIZADA");
        }

        if (resenaArrRepo.existsByEstudianteIdAndArrendadorId(estudianteId, req.getArrendadorId())) {
            throw new IllegalStateException("Ya has reseñado a este arrendador");
        }

        ResenaArrendador resena = ResenaArrendador.builder()
                .arrendadorId(req.getArrendadorId())
                .estudianteId(estudianteId)
                .rating(req.getRating())
                .comentario(req.getComentario())
                .visible(true)
                .build();
        ResenaArrendador guardada = resenaArrRepo.save(resena);
        recalcularArrendador(req.getArrendadorId());
        log.info("⭐ Reseña de arrendador {} creada por estudiante {} (rating={})",
                req.getArrendadorId(), estudianteId, req.getRating());
        return guardada;
    }

    public List<ResenaResponseDTO> listarPorArrendador(Long arrendadorId) {
        List<ResenaArrendador> resenas = resenaArrRepo
                .findByArrendadorIdAndVisibleTrueOrderByFechaCreacionDesc(arrendadorId);
        return mapearConNombresEstudiante(resenas, ResenaArrendador::getEstudianteId,
                r -> ResenaResponseDTO.builder()
                        .id(r.getId())
                        .tipo("ARRENDADOR")
                        .targetId(r.getArrendadorId())
                        .estudianteId(r.getEstudianteId())
                        .rating(r.getRating())
                        .comentario(r.getComentario())
                        .visible(r.getVisible())
                        .fechaCreacion(r.getFechaCreacion())
                        .build());
    }

    public Map<String, Object> calificacionArrendador(Long arrendadorId) {
        Double promedio = resenaArrRepo.promedioRating(arrendadorId);
        long total = resenaArrRepo.countByArrendadorIdAndVisibleTrue(arrendadorId);
        return Map.of(
                "arrendadorId", arrendadorId,
                "calificacion", promedio != null ? promedio : 5.0,
                "numResenas", total
        );
    }

    // ======================= ESTUDIANTE =======================

    @Transactional
    public ResenaEstudiante resenarEstudiante(CrearResenaEstudianteRequest req, CurrentUser current) {
        Long arrendadorId = validarArrendador(current);

        boolean tieneReservaFinalizada = propiedadRepository.findByArrendadorId(arrendadorId).stream()
                .anyMatch(p -> reservaRepository.existsByEstudianteIdAndPropiedadIdAndEstado(
                        req.getEstudianteId(), p.getId(), EstadoReserva.FINALIZADA));
        if (!tieneReservaFinalizada) {
            throw new IllegalStateException("Solo puedes reseñar estudiantes con los que hayas tenido una reserva FINALIZADA");
        }

        if (resenaEstRepo.existsByArrendadorIdAndEstudianteId(arrendadorId, req.getEstudianteId())) {
            throw new IllegalStateException("Ya has reseñado a este estudiante");
        }

        ResenaEstudiante resena = ResenaEstudiante.builder()
                .arrendadorId(arrendadorId)
                .estudianteId(req.getEstudianteId())
                .rating(req.getRating())
                .comentario(req.getComentario())
                .visible(true)
                .build();
        ResenaEstudiante guardada = resenaEstRepo.save(resena);
        log.info("⭐ Reseña de estudiante {} creada por arrendador {} (rating={})",
                req.getEstudianteId(), arrendadorId, req.getRating());
        return guardada;
    }

    public List<ResenaEstudiante> listarPorEstudiante(Long estudianteId) {
        return resenaEstRepo.findByEstudianteIdAndVisibleTrueOrderByFechaCreacionDesc(estudianteId);
    }

    // ======================= MODERACIÓN =======================

    @Transactional
    public ResenaResponseDTO ocultar(Long id, String tipo) {
        if ("PROPIEDAD".equalsIgnoreCase(tipo)) {
            ResenaPropiedad r = resenaPropRepo.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("No existe la reseña de propiedad " + id));
            r.setVisible(false);
            resenaPropRepo.save(r);
            recalcularPropiedad(r.getPropiedadId());
            return ResenaResponseDTO.builder()
                    .id(r.getId()).tipo("PROPIEDAD").targetId(r.getPropiedadId())
                    .estudianteId(r.getEstudianteId()).rating(r.getRating())
                    .comentario(r.getComentario()).visible(false)
                    .fechaCreacion(r.getFechaCreacion()).build();
        } else if ("ARRENDADOR".equalsIgnoreCase(tipo)) {
            ResenaArrendador r = resenaArrRepo.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("No existe la reseña de arrendador " + id));
            r.setVisible(false);
            resenaArrRepo.save(r);
            recalcularArrendador(r.getArrendadorId());
            return ResenaResponseDTO.builder()
                    .id(r.getId()).tipo("ARRENDADOR").targetId(r.getArrendadorId())
                    .estudianteId(r.getEstudianteId()).rating(r.getRating())
                    .comentario(r.getComentario()).visible(false)
                    .fechaCreacion(r.getFechaCreacion()).build();
        }
        throw new IllegalArgumentException("Tipo inválido. Debe ser PROPIEDAD o ARRENDADOR");
    }

    public Object obtenerPorId(Long id, String tipo) {
        if ("PROPIEDAD".equalsIgnoreCase(tipo)) {
            return resenaPropRepo.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("No existe la reseña de propiedad " + id));
        } else if ("ARRENDADOR".equalsIgnoreCase(tipo)) {
            return resenaArrRepo.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("No existe la reseña de arrendador " + id));
        }
        throw new IllegalArgumentException("Tipo inválido. Debe ser PROPIEDAD o ARRENDADOR");
    }

    @Transactional
    public void eliminarResena(Long id, String tipo) {
        if ("PROPIEDAD".equalsIgnoreCase(tipo)) {
            ResenaPropiedad r = (ResenaPropiedad) obtenerPorId(id, tipo);
            resenaPropRepo.delete(r);
            recalcularPropiedad(r.getPropiedadId());
        } else if ("ARRENDADOR".equalsIgnoreCase(tipo)) {
            ResenaArrendador r = (ResenaArrendador) obtenerPorId(id, tipo);
            resenaArrRepo.delete(r);
        }
    }

    // ======================= HELPERS =======================

    private Long validarEstudiante(CurrentUser current) {
        if (current == null || current.getPerfilId() == null) {
            throw new IllegalStateException("No hay perfilId en el contexto de seguridad");
        }
        if (!"ESTUDIANTE".equalsIgnoreCase(current.getRol())) {
            throw new IllegalStateException("Solo un estudiante puede dejar reseñas");
        }
        return current.getPerfilId();
    }

    private Long validarArrendador(CurrentUser current) {
        if (current == null || current.getPerfilId() == null) {
            throw new IllegalStateException("No hay perfilId en el contexto de seguridad");
        }
        if (!"ARRENDADOR".equalsIgnoreCase(current.getRol())) {
            throw new IllegalStateException("Solo un arrendador puede reseñar estudiantes");
        }
        return current.getPerfilId();
    }

    private void recalcularPropiedad(Long propiedadId) {
        Double promedio = resenaPropRepo.promedioRating(propiedadId);
        long total = resenaPropRepo.countByPropiedadIdAndVisibleTrue(propiedadId);
        propiedadRepository.findById(propiedadId).ifPresent(p -> {
            p.setCalificacion(promedio != null ? promedio : 5.0);
            p.setNumResenas((int) total);
            propiedadRepository.save(p);
        });
    }

    private void recalcularArrendador(Long arrendadorId) {
        Double promedio = resenaArrRepo.promedioRating(arrendadorId);
        long total = resenaArrRepo.countByArrendadorIdAndVisibleTrue(arrendadorId);
        kafkaProducerService.enviarCalificacionArrendador(
                arrendadorId,
                promedio != null ? promedio : 5.0,
                total);
    }

    private <T> List<ResenaResponseDTO> mapearConNombresEstudiante(
            List<T> items,
            Function<T, Long> idExtractor,
            Function<T, ResenaResponseDTO> baseMapper) {

        List<Long> ids = items.stream().map(idExtractor).distinct().toList();
        Map<Long, String> nombresPorId = ids.stream()
                .collect(Collectors.toMap(Function.identity(), this::obtenerNombreEstudianteSeguro));

        return items.stream().map(item -> {
            ResenaResponseDTO dto = baseMapper.apply(item);
            dto.setEstudianteNombre(nombresPorId.get(idExtractor.apply(item)));
            return dto;
        }).toList();
    }

    private String obtenerNombreEstudianteSeguro(Long id) {
        try {
            EstudianteInfoDTO info = obtenerEstudianteResiliente(id).join();
            if (info == null) return "Estudiante";
            String nombre = (info.getNombre() != null ? info.getNombre() : "");
            String apellido = (info.getApellido() != null ? " " + info.getApellido() : "");
            return (nombre + apellido).trim().isEmpty() ? "Estudiante" : (nombre + apellido).trim();
        } catch (Exception e) {
            log.warn("No se pudo obtener nombre del estudiante {}: {}", id, e.getMessage());
            return "Estudiante";
        }
    }

    @TimeLimiter(name = "obtenerEstudianteCB")
    @CircuitBreaker(name = "obtenerEstudianteCB", fallbackMethod = "fallbackObtenerEstudiante")
    @Retry(name = "obtenerEstudianteCB")
    @Bulkhead(name = "obtenerEstudianteCB", type = Bulkhead.Type.SEMAPHORE)
    public CompletableFuture<EstudianteInfoDTO> obtenerEstudianteResiliente(Long perfilId) {
        log.info("[Resilience4j] Llamando a servicio-usuarios para estudiante {}", perfilId);
        var attrs = RequestContextHolder.getRequestAttributes();
        return CompletableFuture.supplyAsync(() -> {
            RequestContextHolder.setRequestAttributes(attrs);
            try {
                return usuariosClient.obtenerEstudiante(perfilId);
            } finally {
                RequestContextHolder.resetRequestAttributes();
            }
        });
    }

    @SuppressWarnings("unused")
    private CompletableFuture<EstudianteInfoDTO> fallbackObtenerEstudiante(Long perfilId, Throwable t) {
        log.error("[FALLBACK] obtenerEstudiante({}) — {}: {}",
                perfilId, t.getClass().getSimpleName(), t.getMessage());
        EstudianteInfoDTO defaultInfo = new EstudianteInfoDTO();
        defaultInfo.setId(perfilId);
        defaultInfo.setNombre("Estudiante");
        defaultInfo.setApellido("");
        return CompletableFuture.completedFuture(defaultInfo);
    }
}
