package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.clients.UsuariosClient;
import com.alquilaya.serviciopropiedades.config.CurrentUser;
import com.alquilaya.serviciopropiedades.dto.CrearResenaArrendadorRequest;
import com.alquilaya.serviciopropiedades.dto.CrearResenaPropiedadRequest;
import com.alquilaya.serviciopropiedades.dto.EstudianteInfoDTO;
import com.alquilaya.serviciopropiedades.dto.ResenaResponseDTO;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.entities.ResenaArrendador;
import com.alquilaya.serviciopropiedades.entities.ResenaPropiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.ResenaArrendadorRepository;
import com.alquilaya.serviciopropiedades.repositories.ResenaPropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResenaService {

    private final ResenaPropiedadRepository resenaPropRepo;
    private final ResenaArrendadorRepository resenaArrRepo;
    private final ReservaRepository reservaRepository;
    private final PropiedadRepository propiedadRepository;
    private final UsuariosClient usuariosClient;

    // ======================= PROPIEDAD =======================

    @Transactional
    public ResenaPropiedad resenarPropiedad(CrearResenaPropiedadRequest req, CurrentUser current) {
        Long estudianteId = validarEstudiante(current);

        boolean tieneReservaFinalizada = reservaRepository.existsByEstudianteIdAndPropiedadIdAndEstado(
                estudianteId, req.getPropiedadId(), EstadoReserva.FINALIZADA);
        if (!tieneReservaFinalizada) {
            throw new IllegalStateException("Solo puedes reseñar propiedades donde tu reserva esté FINALIZADA");
        }

        ResenaPropiedad resena = ResenaPropiedad.builder()
                .propiedadId(req.getPropiedadId())
                .estudianteId(estudianteId)
                .rating(req.getRating())
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
                        .comentario(r.getComentario())
                        .visible(r.getVisible())
                        .fechaCreacion(r.getFechaCreacion())
                        .build());
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

        ResenaArrendador resena = ResenaArrendador.builder()
                .arrendadorId(req.getArrendadorId())
                .estudianteId(estudianteId)
                .rating(req.getRating())
                .comentario(req.getComentario())
                .visible(true)
                .build();
        ResenaArrendador guardada = resenaArrRepo.save(resena);
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
            return ResenaResponseDTO.builder()
                    .id(r.getId()).tipo("ARRENDADOR").targetId(r.getArrendadorId())
                    .estudianteId(r.getEstudianteId()).rating(r.getRating())
                    .comentario(r.getComentario()).visible(false)
                    .fechaCreacion(r.getFechaCreacion()).build();
        }
        throw new IllegalArgumentException("Tipo inválido. Debe ser PROPIEDAD o ARRENDADOR");
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

    private void recalcularPropiedad(Long propiedadId) {
        Double promedio = resenaPropRepo.promedioRating(propiedadId);
        long total = resenaPropRepo.countByPropiedadIdAndVisibleTrue(propiedadId);
        propiedadRepository.findById(propiedadId).ifPresent(p -> {
            p.setCalificacion(promedio != null ? promedio : 5.0);
            p.setNumResenas((int) total);
            propiedadRepository.save(p);
        });
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
            EstudianteInfoDTO info = usuariosClient.obtenerEstudiante(id);
            if (info == null) return "Estudiante";
            String nombre = (info.getNombre() != null ? info.getNombre() : "");
            String apellido = (info.getApellido() != null ? " " + info.getApellido() : "");
            return (nombre + apellido).trim().isEmpty() ? "Estudiante" : (nombre + apellido).trim();
        } catch (Exception e) {
            log.warn("No se pudo obtener nombre del estudiante {}: {}", id, e.getMessage());
            return "Estudiante";
        }
    }
}
