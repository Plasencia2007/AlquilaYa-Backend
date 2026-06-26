package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.clients.UsuariosClient;
import com.alquilaya.serviciopropiedades.dto.CrearGrupoRequest;
import com.alquilaya.serviciopropiedades.dto.CuotaPagoDTO;
import com.alquilaya.serviciopropiedades.dto.GrupoRoommateDTO;
import com.alquilaya.serviciopropiedades.entities.CuotaGrupo;
import com.alquilaya.serviciopropiedades.entities.GrupoRoommate;
import com.alquilaya.serviciopropiedades.entities.MiembroGrupo;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoGrupo;
import com.alquilaya.serviciopropiedades.enums.EstadoMiembro;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.repositories.CuotaGrupoRepository;
import com.alquilaya.serviciopropiedades.repositories.GrupoRoommateRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/** Gestión de grupos de roommates (#38 Fase 1b): crear, invitar, unirse, aprobar. */
@Service
@RequiredArgsConstructor
@Slf4j
public class GrupoRoommateService {

    private final GrupoRoommateRepository grupoRepo;
    private final PropiedadRepository propiedadRepository;
    private final ReservaRepository reservaRepository;
    private final CuotaGrupoRepository cuotaRepo;
    private final ComisionService comisionService;
    private final UsuariosClient usuariosClient;

    @Transactional
    public GrupoRoommateDTO crear(CrearGrupoRequest req, Long creadorId) {
        Propiedad p = propiedadRepository.findById(req.getPropiedadId())
                .orElseThrow(() -> new IllegalArgumentException("No existe la propiedad " + req.getPropiedadId()));
        int cupos = req.getCuposTotales() != null
                ? req.getCuposTotales()
                : (p.getCapacidadPersonas() != null && p.getCapacidadPersonas() > 1 ? p.getCapacidadPersonas() : 2);
        if (cupos < 2) {
            throw new IllegalArgumentException("Un grupo de roommates necesita al menos 2 cupos");
        }
        GrupoRoommate g = GrupoRoommate.builder()
                .propiedadId(p.getId())
                .creadorEstudianteId(creadorId)
                .nombre(req.getNombre() != null && !req.getNombre().isBlank()
                        ? req.getNombre().trim() : "Grupo para " + p.getTitulo())
                .descripcion(req.getDescripcion())
                .cuposTotales(cupos)
                .estado(EstadoGrupo.ABIERTO)
                .build();
        g.getMiembros().add(MiembroGrupo.builder()
                .grupo(g).estudianteId(creadorId).estado(EstadoMiembro.CREADOR).build());
        grupoRepo.save(g);
        log.info("[GRUPO] Estudiante {} creó grupo {} para propiedad {} ({} cupos)",
                creadorId, g.getId(), p.getId(), cupos);
        return toDTO(g);
    }

    @Transactional(readOnly = true)
    public GrupoRoommateDTO obtener(Long id) {
        return toDTO(get(id));
    }

    @Transactional(readOnly = true)
    public List<GrupoRoommateDTO> abiertosDePropiedad(Long propiedadId) {
        return grupoRepo.findByPropiedadIdAndEstado(propiedadId, EstadoGrupo.ABIERTO).stream()
                .map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<GrupoRoommateDTO> misGrupos(Long estudianteId) {
        return grupoRepo.findByMiembro(estudianteId).stream().map(this::toDTO).toList();
    }

    @Transactional
    public GrupoRoommateDTO solicitar(Long grupoId, Long estudianteId) {
        GrupoRoommate g = get(grupoId);
        validarUnible(g, estudianteId);
        g.getMiembros().add(MiembroGrupo.builder()
                .grupo(g).estudianteId(estudianteId).estado(EstadoMiembro.SOLICITADO).build());
        grupoRepo.save(g);
        return toDTO(g);
    }

    @Transactional
    public GrupoRoommateDTO unirPorCodigo(String codigo, Long estudianteId) {
        GrupoRoommate g = grupoRepo.findByCodigoInvitacion(codigo)
                .orElseThrow(() -> new IllegalArgumentException("Código de invitación inválido"));
        validarUnible(g, estudianteId);
        g.getMiembros().add(MiembroGrupo.builder()
                .grupo(g).estudianteId(estudianteId).estado(EstadoMiembro.UNIDO).build());
        recomputar(g);
        grupoRepo.save(g);
        return toDTO(g);
    }

    @Transactional
    public GrupoRoommateDTO aprobar(Long grupoId, Long miembroEstudianteId, Long actorId) {
        GrupoRoommate g = get(grupoId);
        if (!g.getCreadorEstudianteId().equals(actorId)) {
            throw new IllegalStateException("Solo el creador puede aprobar miembros");
        }
        if (ocupados(g) >= g.getCuposTotales()) {
            throw new IllegalStateException("El grupo ya está completo");
        }
        MiembroGrupo m = g.getMiembros().stream()
                .filter(x -> x.getEstudianteId().equals(miembroEstudianteId) && x.getEstado() == EstadoMiembro.SOLICITADO)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No hay una solicitud de ese estudiante"));
        m.setEstado(EstadoMiembro.UNIDO);
        recomputar(g);
        grupoRepo.save(g);
        return toDTO(g);
    }

    @Transactional
    public GrupoRoommateDTO salir(Long grupoId, Long estudianteId) {
        GrupoRoommate g = get(grupoId);
        if (g.getCreadorEstudianteId().equals(estudianteId)) {
            throw new IllegalStateException("El creador no puede salir; debe eliminar el grupo");
        }
        boolean removed = g.getMiembros().removeIf(m -> m.getEstudianteId().equals(estudianteId));
        if (!removed) {
            throw new IllegalArgumentException("No eres miembro de este grupo");
        }
        recomputar(g);
        grupoRepo.save(g);
        return toDTO(g);
    }

    @Transactional
    public void eliminar(Long grupoId, Long actorId) {
        GrupoRoommate g = get(grupoId);
        if (!g.getCreadorEstudianteId().equals(actorId)) {
            throw new IllegalStateException("Solo el creador puede eliminar el grupo");
        }
        grupoRepo.delete(g);
        log.info("[GRUPO] Grupo {} eliminado por {}", grupoId, actorId);
    }

    // ===== Reserva grupal + cuotas (Fase 2) =====

    /**
     * Genera la reserva grupal: crea UNA reserva por la unidad (SOLICITADA, pendiente de que el
     * arrendador la apruebe como cualquier reserva) y divide el total en cuotas, una por miembro
     * activo. El creador absorbe el redondeo para que la suma cuadre exacta.
     */
    @Transactional
    public GrupoRoommateDTO reservarGrupo(Long grupoId, Long creadorId, LocalDate fechaInicio, LocalDate fechaFin) {
        GrupoRoommate g = get(grupoId);
        if (!g.getCreadorEstudianteId().equals(creadorId)) {
            throw new IllegalStateException("Solo el creador puede reservar el grupo");
        }
        if (g.getEstado() != EstadoGrupo.COMPLETO) {
            throw new IllegalStateException("El grupo debe estar completo para reservar");
        }
        if (fechaInicio == null || fechaFin == null || !fechaFin.isAfter(fechaInicio)) {
            throw new IllegalArgumentException("Las fechas de la estadía son inválidas");
        }
        Propiedad p = propiedadRepository.findById(g.getPropiedadId())
                .orElseThrow(() -> new IllegalArgumentException("No existe la propiedad del grupo"));

        long dias = ChronoUnit.DAYS.between(fechaInicio, fechaFin) + 1;
        long meses = Math.max(1, Math.round(dias / 30.0));
        BigDecimal montoTotal = p.getPrecio().multiply(BigDecimal.valueOf(meses)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal comision = comisionService.calcular(p.getZonaId(), montoTotal);
        if (comision == null) comision = BigDecimal.ZERO;

        Reserva r = Reserva.builder()
                .propiedadId(p.getId())
                .estudianteId(creadorId)
                .arrendadorId(p.getArrendadorId())
                .fechaInicio(fechaInicio)
                .fechaFin(fechaFin)
                .montoTotal(montoTotal)
                .grupoId(g.getId())
                .estado(EstadoReserva.SOLICITADA)
                .build();
        Reserva guardada = reservaRepository.save(r);

        List<MiembroGrupo> activos = g.getMiembros().stream()
                .filter(m -> m.getEstado() == EstadoMiembro.CREADOR || m.getEstado() == EstadoMiembro.UNIDO)
                .toList();
        int n = activos.size();
        BigDecimal total = montoTotal.add(comision);
        BigDecimal base = total.divide(BigDecimal.valueOf(n), 2, RoundingMode.DOWN);
        BigDecimal resto = total.subtract(base.multiply(BigDecimal.valueOf(n)));
        for (MiembroGrupo m : activos) {
            BigDecimal monto = m.getEstudianteId().equals(creadorId) ? base.add(resto) : base;
            cuotaRepo.save(CuotaGrupo.builder()
                    .grupoId(g.getId()).reservaId(guardada.getId()).estudianteId(m.getEstudianteId())
                    .monto(monto).estado("PENDIENTE").build());
        }
        g.setEstado(EstadoGrupo.RESERVADO);
        grupoRepo.save(g);
        log.info("[GRUPO] Grupo {} → reserva {} (propiedad {}), {} cuotas, total {}",
                grupoId, guardada.getId(), p.getId(), n, total);
        return toDTO(g);
    }

    /** Cuota del miembro actual en una reserva grupal (la usa pagos para cobrar su parte). */
    @Transactional(readOnly = true)
    public CuotaPagoDTO miCuota(Long reservaId, Long estudianteId) {
        CuotaGrupo c = cuotaRepo.findByReservaIdAndEstudianteId(reservaId, estudianteId)
                .orElseThrow(() -> new IllegalArgumentException("No tienes una cuota en esta reserva grupal"));
        String titulo = reservaRepository.findById(reservaId)
                .flatMap(r -> propiedadRepository.findById(r.getPropiedadId()))
                .map(Propiedad::getTitulo).orElse("Propiedad");
        String nombre = "Estudiante " + estudianteId;
        String correo = "";
        try {
            var e = usuariosClient.obtenerEstudiante(estudianteId);
            if (e != null) {
                nombre = e.getNombre() + " " + (e.getApellido() != null ? e.getApellido() : "");
                correo = e.getCorreo();
            }
        } catch (Exception ignored) {
            // best-effort: si usuarios no responde, se usa el placeholder
        }
        return new CuotaPagoDTO(reservaId, c.getGrupoId(), estudianteId, c.getMonto(), c.getEstado(),
                titulo, nombre, correo);
    }

    /** Estado de todas las cuotas de una reserva grupal (progreso de pago). */
    @Transactional(readOnly = true)
    public List<CuotaPagoDTO> cuotasDeReserva(Long reservaId) {
        return cuotaRepo.findByReservaId(reservaId).stream()
                .map(c -> new CuotaPagoDTO(reservaId, c.getGrupoId(), c.getEstudianteId(),
                        c.getMonto(), c.getEstado(), null, null, null))
                .toList();
    }

    // ===== Helpers =====

    private void validarUnible(GrupoRoommate g, Long estudianteId) {
        if (g.getEstado() != EstadoGrupo.ABIERTO) {
            throw new IllegalStateException("El grupo no está abierto a nuevos miembros");
        }
        if (ocupados(g) >= g.getCuposTotales()) {
            throw new IllegalStateException("El grupo ya está completo");
        }
        boolean yaEsta = g.getMiembros().stream().anyMatch(m -> m.getEstudianteId().equals(estudianteId));
        if (yaEsta) {
            throw new IllegalStateException("Ya estás en este grupo");
        }
    }

    private int ocupados(GrupoRoommate g) {
        return (int) g.getMiembros().stream()
                .filter(m -> m.getEstado() == EstadoMiembro.CREADOR || m.getEstado() == EstadoMiembro.UNIDO)
                .count();
    }

    private void recomputar(GrupoRoommate g) {
        if (g.getEstado() == EstadoGrupo.RESERVADO || g.getEstado() == EstadoGrupo.CERRADO) return;
        g.setEstado(ocupados(g) >= g.getCuposTotales() ? EstadoGrupo.COMPLETO : EstadoGrupo.ABIERTO);
    }

    private GrupoRoommate get(Long id) {
        return grupoRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("No existe el grupo " + id));
    }

    private GrupoRoommateDTO toDTO(GrupoRoommate g) {
        String titulo = propiedadRepository.findById(g.getPropiedadId())
                .map(Propiedad::getTitulo).orElse("Propiedad");
        GrupoRoommateDTO dto = GrupoRoommateDTO.from(g, titulo);
        if (g.getEstado() == EstadoGrupo.RESERVADO) {
            reservaRepository.findFirstByGrupoId(g.getId()).ifPresent(r -> dto.setReservaId(r.getId()));
        }
        return dto;
    }
}
