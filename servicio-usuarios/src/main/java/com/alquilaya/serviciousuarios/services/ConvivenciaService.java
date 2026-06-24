package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.ActualizarConvivenciaRequest;
import com.alquilaya.serviciousuarios.dto.PerfilConvivenciaDTO;
import com.alquilaya.serviciousuarios.dto.ReputacionResumen;
import com.alquilaya.serviciousuarios.entities.Estudiante;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.exceptions.RecursoNoEncontradoException;
import com.alquilaya.serviciousuarios.repositories.EstudianteRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    /** Board de matchmaking: estudiantes que buscan compañeros, excluyendo al usuario actual. */
    @Transactional(readOnly = true)
    public List<PerfilConvivenciaDTO> listarBuscando(String correoActual) {
        Long miId = usuarioRepository.findByCorreo(correoActual)
                .map(u -> u.getEstudiante() != null ? u.getEstudiante().getId() : null)
                .orElse(null);
        return estudianteRepository.findByBuscaCompanerosTrue().stream()
                .filter(e -> !e.getId().equals(miId))
                .map(this::toDTO)
                .toList();
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
        Usuario u = e.getUsuario();
        ReputacionResumen rep = reputacionService.calcularEstudiante(e);
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
                .buscaCompaneros(e.isBuscaCompaneros())
                .intereses(e.getIntereses())
                .zonasPreferidas(e.getZonasPreferidas())
                .build();
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
