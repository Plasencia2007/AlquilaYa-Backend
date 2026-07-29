package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.clients.UsuariosClient;
import com.alquilaya.serviciopropiedades.dto.EstudianteInfoDTO;
import com.alquilaya.serviciopropiedades.dto.PreguntaPropiedadResponseDTO;
import com.alquilaya.serviciopropiedades.entities.PreguntaPropiedad;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.repositories.PreguntaPropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Q&A pública por propiedad (ítem 166): cualquier estudiante puede preguntar algo público
 * sobre la propiedad; el arrendador dueño responde también públicamente. Sigue el mismo
 * patrón de FK lógica + validación de ownership que {@link ResenaService}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PreguntaPropiedadService {

    private final PreguntaPropiedadRepository preguntaRepo;
    private final PropiedadRepository propiedadRepository;
    private final UsuariosClient usuariosClient;

    /**
     * Crea una pregunta pública. Valida que la propiedad exista y que haya un estudiante
     * autenticado. El nombre se resuelve vía Feign a servicio-usuarios y se guarda como
     * snapshot (mismo patrón que {@code estudianteNombre} en {@code ReservaResponseDTO}):
     * evita una llamada Feign por cada lectura del listado público.
     */
    @Transactional
    public PreguntaPropiedad crearPregunta(Long propiedadId, Long estudianteId, String texto) {
        if (estudianteId == null) {
            throw new IllegalStateException("No hay perfilId en el contexto de seguridad");
        }
        propiedadRepository.findById(propiedadId)
                .orElseThrow(() -> new IllegalArgumentException("No existe la propiedad " + propiedadId));

        PreguntaPropiedad pregunta = PreguntaPropiedad.builder()
                .propiedadId(propiedadId)
                .estudianteId(estudianteId)
                .estudianteNombre(resolverNombreEstudiante(estudianteId))
                .pregunta(texto)
                .visible(true)
                .build();
        PreguntaPropiedad guardada = preguntaRepo.save(pregunta);
        log.info("❓ Pregunta creada en propiedad {} por estudiante {}", propiedadId, estudianteId);
        return guardada;
    }

    /**
     * El arrendador dueño de la propiedad responde públicamente una pregunta. Valida
     * ownership igual que {@code PropiedadController.verificarPropietarioOAdmin}: lanza
     * {@link AccessDeniedException} (403) si el solicitante no es el dueño.
     */
    @Transactional
    public PreguntaPropiedadResponseDTO responder(Long preguntaId, Long arrendadorId, String respuesta) {
        PreguntaPropiedad pregunta = preguntaRepo.findById(preguntaId)
                .orElseThrow(() -> new IllegalArgumentException("No existe la pregunta " + preguntaId));
        Propiedad propiedad = propiedadRepository.findById(pregunta.getPropiedadId())
                .orElseThrow(() -> new IllegalArgumentException("No existe la propiedad de la pregunta"));
        if (arrendadorId == null || !arrendadorId.equals(propiedad.getArrendadorId())) {
            log.warn("[AUTH] Usuario perfilId={} intentó responder la pregunta {} de la propiedad {} (dueño={})",
                    arrendadorId, preguntaId, propiedad.getId(), propiedad.getArrendadorId());
            throw new AccessDeniedException("Solo el arrendador dueño de la propiedad puede responder esta pregunta.");
        }
        String texto = respuesta != null ? respuesta.trim() : "";
        if (texto.isEmpty()) {
            throw new IllegalArgumentException("La respuesta no puede estar vacía");
        }
        if (texto.length() > 500) {
            throw new IllegalArgumentException("La respuesta no puede exceder 500 caracteres");
        }
        pregunta.setRespuesta(texto);
        pregunta.setFechaRespuesta(LocalDateTime.now());
        return mapear(preguntaRepo.save(pregunta));
    }

    public List<PreguntaPropiedadResponseDTO> listarPorPropiedad(Long propiedadId) {
        return preguntaRepo.findByPropiedadIdAndVisibleTrueOrderByFechaCreacionDesc(propiedadId)
                .stream()
                .map(this::mapear)
                .toList();
    }

    private PreguntaPropiedadResponseDTO mapear(PreguntaPropiedad p) {
        return PreguntaPropiedadResponseDTO.builder()
                .id(p.getId())
                .propiedadId(p.getPropiedadId())
                .estudianteId(p.getEstudianteId())
                .estudianteNombre(p.getEstudianteNombre())
                .pregunta(p.getPregunta())
                .respuesta(p.getRespuesta())
                .fechaRespuesta(p.getFechaRespuesta())
                .fechaCreacion(p.getFechaCreacion())
                .build();
    }

    /** Resuelve "Nombre Apellido" vía Feign; degrada a "Estudiante" si el servicio no responde. */
    private String resolverNombreEstudiante(Long estudianteId) {
        EstudianteInfoDTO info = usuariosClient.obtenerEstudiante(estudianteId);
        if (info == null) {
            return "Estudiante";
        }
        String nombre = info.getNombre() != null ? info.getNombre() : "";
        String apellido = info.getApellido() != null ? " " + info.getApellido() : "";
        String completo = (nombre + apellido).trim();
        return completo.isEmpty() ? "Estudiante" : completo;
    }
}
