package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.ActualizarConvivenciaRequest;
import com.alquilaya.serviciousuarios.dto.CompatibilidadItemDTO;
import com.alquilaya.serviciousuarios.dto.PerfilConvivenciaDTO;
import com.alquilaya.serviciousuarios.dto.ReputacionResumen;
import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.exceptions.RecursoNoEncontradoException;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

/** Perfil de convivencia del estudiante (#38 Fase 0): tarjeta de roommate + edición + completitud. */
@Service
@RequiredArgsConstructor
public class ConvivenciaService {

    private final EstudianteRepository estudianteRepository;
    private final UsuarioRepository usuarioRepository;
    private final ReputacionService reputacionService;

    @Transactional(readOnly = true)
    public PerfilConvivenciaDTO obtener(Long estudianteId) {
        Estudiante e = estudianteRepository.findById(estudianteId)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el estudiante " + estudianteId));
        return toDTO(e);
    }

    /**
     * Board de matchmaking: estudiantes que buscan compañeros, excluyendo al usuario actual,
     * ordenados por compatibilidad descendente y paginados (ítem 216).
     *
     * <p>La compatibilidad depende de quién pregunta, así que no se puede paginar/ordenar a nivel
     * de SQL: se calcula en memoria para todos los candidatos y luego se recorta la página pedida.
     */
    @Transactional(readOnly = true)
    public Page<PerfilConvivenciaDTO> listarBuscando(String correoActual, Pageable pageable) {
        Usuario miUsuario = usuarioRepository.findByCorreo(correoActual).orElse(null);
        Estudiante miPerfil = miUsuario != null ? miUsuario.getEstudiante() : null;
        Long miId = miPerfil != null ? miPerfil.getId() : null;

        List<PerfilConvivenciaDTO> todos = estudianteRepository.findByBuscaCompanerosTrue().stream()
                .filter(e -> !e.getId().equals(miId))
                .map(e -> toDTOWithCompat(e, miPerfil))
                .sorted((a, b) -> {
                    int scoreA = a.getCompatibilidadScore() != null ? a.getCompatibilidadScore() : 0;
                    int scoreB = b.getCompatibilidadScore() != null ? b.getCompatibilidadScore() : 0;
                    return Integer.compare(scoreB, scoreA); // Descendente
                })
                .toList();

        int total = todos.size();
        int start = (int) pageable.getOffset();
        if (start >= total) {
            return new PageImpl<>(List.of(), pageable, total);
        }
        int end = Math.min(start + pageable.getPageSize(), total);
        return new PageImpl<>(todos.subList(start, end), pageable, total);
    }

    @Transactional(readOnly = true)
    public PerfilConvivenciaDTO obtenerPropio(String correo) {
        Usuario u = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
        Estudiante e = u.getEstudiante();
        if (e == null) {
            throw new IllegalStateException("Solo los estudiantes tienen perfil de convivencia");
        }
        return toDTO(e);
    }

    @Transactional
    public PerfilConvivenciaDTO actualizarPropio(String correo, ActualizarConvivenciaRequest r) {
        Usuario u = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
        Estudiante e = u.getEstudiante();
        if (e == null) {
            throw new IllegalStateException("Solo los estudiantes tienen perfil de convivencia");
        }
        e.setBio(r.getBio());
        e.setInstagram(r.getInstagram());
        e.setFuma(r.getFuma());
        e.setHorario(r.getHorario());
        e.setOrden(r.getOrden());
        e.setRuido(r.getRuido());
        e.setSociabilidad(r.getSociabilidad());
        e.setMascotas(r.getMascotas());
        e.setInvitados(r.getInvitados());
        e.setGenero(r.getGenero());
        e.setComparteCon(r.getComparteCon());
        e.setPresupuestoMin(r.getPresupuestoMin());
        e.setPresupuestoMax(r.getPresupuestoMax());
        e.setFechaMudanza(r.getFechaMudanza());
        e.setNumCompaneros(r.getNumCompaneros());
        if (r.getBuscaCompaneros() != null) e.setBuscaCompaneros(r.getBuscaCompaneros());
        e.setIntereses(r.getIntereses() != null ? new HashSet<>(r.getIntereses()) : new HashSet<>());
        e.setZonasPreferidas(r.getZonasPreferidas() != null ? new HashSet<>(r.getZonasPreferidas()) : new HashSet<>());
        estudianteRepository.save(e);
        return toDTO(e);
    }

    private PerfilConvivenciaDTO toDTO(Estudiante e) {
        return toDTOWithCompat(e, null);
    }

    private PerfilConvivenciaDTO toDTOWithCompat(Estudiante e, Estudiante miPerfil) {
        Usuario u = e.getUsuario();
        ReputacionResumen rep = reputacionService.calcularEstudiante(e);

        Integer compatScore = null;
        String compatNivel = null;
        List<CompatibilidadItemDTO> compatDesglose = null;

        if (miPerfil != null) {
            ResultadoCompat resultado = calcularCompatibilidad(miPerfil, e);
            compatScore = resultado.score();
            compatDesglose = resultado.desglose();
            if (compatScore != null) {
                compatNivel = compatScore >= 75 ? "Alta" : compatScore >= 45 ? "Media" : "Baja";
            }
        }

        return PerfilConvivenciaDTO.builder()
                .estudianteId(e.getId())
                .usuarioId(u != null ? u.getId() : null)
                .nombre(u != null ? u.getNombre() : null)
                .apellido(u != null ? u.getApellido() : null)
                .avatar(u != null ? u.getFotoUrl() : null)
                .universidad(e.getUniversidad())
                .carrera(e.getCarrera())
                .ciclo(e.getCiclo())
                .verificado(e.isVerificado())
                .score(rep.score())
                .nivelReputacion(rep.nivel().name())
                .completitud(completitud(e))
                .compatibilidadScore(compatScore)
                .compatibilidadNivel(compatNivel)
                .compatibilidadDesglose(compatDesglose)
                .bio(e.getBio())
                .instagram(e.getInstagram())
                .fuma(e.getFuma())
                .horario(e.getHorario())
                .orden(e.getOrden())
                .ruido(e.getRuido())
                .sociabilidad(e.getSociabilidad())
                .mascotas(e.getMascotas())
                .invitados(e.getInvitados())
                .genero(e.getGenero())
                .comparteCon(e.getComparteCon())
                .presupuestoMin(e.getPresupuestoMin())
                .presupuestoMax(e.getPresupuestoMax())
                .fechaMudanza(e.getFechaMudanza())
                .numCompaneros(e.getNumCompaneros())
                .buscaCompaneros(Boolean.TRUE.equals(e.getBuscaCompaneros()))
                .intereses(e.getIntereses())
                .zonasPreferidas(e.getZonasPreferidas())
                .build();
    }

    /** Score + desglose por dimensión de una comparación de compatibilidad (ítem 215). */
    private record ResultadoCompat(Integer score, List<CompatibilidadItemDTO> desglose) {}

    /** Una dimensión de hábito comparable directo (igual/distinto) por texto. */
    private record Dimension(String campo, String label, String valorMi, String valorOtro) {}

    private ResultadoCompat calcularCompatibilidad(Estudiante mi, Estudiante otro) {
        if (mi == null || otro == null) {
            return new ResultadoCompat(null, null);
        }
        int comparables = 0;
        int coinciden = 0;
        List<CompatibilidadItemDTO> desglose = new ArrayList<>();

        List<Dimension> dimensiones = List.of(
                new Dimension("fuma", "Fumar", mi.getFuma(), otro.getFuma()),
                new Dimension("horario", "Horario", mi.getHorario(), otro.getHorario()),
                new Dimension("orden", "Orden y limpieza", mi.getOrden(), otro.getOrden()),
                new Dimension("ruido", "Ruido", mi.getRuido(), otro.getRuido()),
                new Dimension("sociabilidad", "Sociabilidad", mi.getSociabilidad(), otro.getSociabilidad()),
                new Dimension("mascotas", "Mascotas", mi.getMascotas(), otro.getMascotas()),
                new Dimension("invitados", "Invitados", mi.getInvitados(), otro.getInvitados()));

        for (Dimension d : dimensiones) {
            if (notBlank(d.valorMi()) && notBlank(d.valorOtro())) {
                comparables++;
                boolean coincide = d.valorMi().equalsIgnoreCase(d.valorOtro());
                if (coincide) coinciden++;
                desglose.add(new CompatibilidadItemDTO(d.campo(), d.label(), coincide));
            }
        }

        if (mi.getPresupuestoMax() != null && otro.getPresupuestoMax() != null) {
            comparables++;
            int miMin = mi.getPresupuestoMin() != null ? mi.getPresupuestoMin() : 0;
            int otroMin = otro.getPresupuestoMin() != null ? otro.getPresupuestoMin() : 0;
            boolean solapan = Math.max(miMin, otroMin) <= Math.min(mi.getPresupuestoMax(), otro.getPresupuestoMax());
            if (solapan) coinciden++;
            desglose.add(new CompatibilidadItemDTO("presupuesto", "Presupuesto", solapan));
        }

        int score = comparables == 0 ? 0 : (int) Math.round((double) coinciden / comparables * 100);
        return new ResultadoCompat(score, desglose);
    }

    /** % de completitud del perfil de convivencia (14 campos clave). */
    private int completitud(Estudiante e) {
        int total = 14;
        int llenos = 0;
        if (notBlank(e.getBio())) llenos++;
        if (notBlank(e.getFuma())) llenos++;
        if (notBlank(e.getHorario())) llenos++;
        if (notBlank(e.getOrden())) llenos++;
        if (notBlank(e.getRuido())) llenos++;
        if (notBlank(e.getSociabilidad())) llenos++;
        if (notBlank(e.getMascotas())) llenos++;
        if (notBlank(e.getInvitados())) llenos++;
        if (notBlank(e.getGenero())) llenos++;
        if (notBlank(e.getComparteCon())) llenos++;
        if (e.getPresupuestoMax() != null) llenos++;
        if (e.getFechaMudanza() != null) llenos++;
        if (e.getIntereses() != null && !e.getIntereses().isEmpty()) llenos++;
        if (e.getZonasPreferidas() != null && !e.getZonasPreferidas().isEmpty()) llenos++;
        return (int) Math.round(llenos * 100.0 / total);
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
