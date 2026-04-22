package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.clients.UsuariosClient;
import com.alquilaya.serviciopropiedades.config.CurrentUser;
import com.alquilaya.serviciopropiedades.dto.ArrendadorInfoDTO;
import com.alquilaya.serviciopropiedades.dto.CrearReservaRequest;
import com.alquilaya.serviciopropiedades.dto.EstudianteInfoDTO;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.enums.PeriodoAlquiler;
import com.alquilaya.serviciopropiedades.kafka.ReservaEventProducer;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservaService {

    private final ReservaRepository reservaRepository;
    private final PropiedadRepository propiedadRepository;
    private final UsuariosClient usuariosClient;
    private final ReservaEventProducer reservaEventProducer;

    private static final EnumSet<EstadoReserva> ESTADOS_BLOQUEANTES =
            EnumSet.of(EstadoReserva.SOLICITADA, EstadoReserva.APROBADA, EstadoReserva.PAGADA);

    @Transactional
    public Reserva crearSolicitud(CrearReservaRequest req, CurrentUser current) {
        if (current == null || current.getPerfilId() == null) {
            throw new IllegalStateException("No se pudo determinar el estudiante actual");
        }
        if (!"ESTUDIANTE".equalsIgnoreCase(current.getRol())) {
            throw new IllegalStateException("Solo un estudiante puede crear una reserva");
        }
        if (req.getFechaFin().isBefore(req.getFechaInicio())) {
            throw new IllegalArgumentException("La fecha de fin no puede ser anterior a la de inicio");
        }

        Propiedad propiedad = propiedadRepository.findById(req.getPropiedadId())
                .orElseThrow(() -> new IllegalArgumentException("No existe la propiedad " + req.getPropiedadId()));

        if (propiedad.getAprobadoPorAdmin() == null || !propiedad.getAprobadoPorAdmin()) {
            throw new IllegalStateException("La propiedad no está aprobada y no se puede reservar");
        }
        if (Boolean.FALSE.equals(propiedad.getEstaDisponible())) {
            throw new IllegalStateException("La propiedad no está disponible");
        }

        boolean solapada = reservaRepository
                .existsByPropiedadIdAndEstadoInAndFechaInicioLessThanEqualAndFechaFinGreaterThanEqual(
                        propiedad.getId(), ESTADOS_BLOQUEANTES, req.getFechaFin(), req.getFechaInicio());
        if (solapada) {
            throw new IllegalStateException("Ya existe una reserva activa que se solapa con esas fechas");
        }

        BigDecimal monto = calcularMonto(propiedad, req);

        Reserva reserva = Reserva.builder()
                .propiedadId(propiedad.getId())
                .estudianteId(current.getPerfilId())
                .arrendadorId(propiedad.getArrendadorId())
                .fechaInicio(req.getFechaInicio())
                .fechaFin(req.getFechaFin())
                .montoTotal(monto)
                .estado(EstadoReserva.SOLICITADA)
                .build();

        Reserva guardada = reservaRepository.save(reserva);
        emitirEvento("RESERVA_SOLICITADA", guardada, current);
        return guardada;
    }

    @Transactional
    public Reserva aprobar(Long reservaId, CurrentUser current) {
        Reserva r = obtener(reservaId);
        validarArrendador(r, current);
        if (r.getEstado() != EstadoReserva.SOLICITADA) {
            throw new IllegalStateException("Solo se pueden aprobar reservas en estado SOLICITADA");
        }
        r.setEstado(EstadoReserva.APROBADA);
        Reserva guardada = reservaRepository.save(r);
        emitirEvento("RESERVA_APROBADA", guardada, current);
        return guardada;
    }

    @Transactional
    public Reserva rechazar(Long reservaId, String motivo, CurrentUser current) {
        Reserva r = obtener(reservaId);
        validarArrendador(r, current);
        if (r.getEstado() != EstadoReserva.SOLICITADA) {
            throw new IllegalStateException("Solo se pueden rechazar reservas en estado SOLICITADA");
        }
        r.setEstado(EstadoReserva.RECHAZADA);
        r.setMotivoRechazo(motivo);
        Reserva guardada = reservaRepository.save(r);
        emitirEvento("RESERVA_RECHAZADA", guardada, current);
        return guardada;
    }

    @Transactional
    public Reserva marcarPagada(Long reservaId) {
        Reserva r = obtener(reservaId);
        if (r.getEstado() != EstadoReserva.APROBADA) {
            throw new IllegalStateException("Solo se pueden marcar como PAGADAS reservas APROBADAS");
        }
        r.setEstado(EstadoReserva.PAGADA);
        Reserva guardada = reservaRepository.save(r);
        emitirEvento("RESERVA_PAGADA", guardada, null);
        return guardada;
    }

    @Transactional
    public Reserva cancelar(Long reservaId, CurrentUser current) {
        Reserva r = obtener(reservaId);
        if (current == null || current.getPerfilId() == null) {
            throw new IllegalStateException("Sin perfilId en contexto");
        }
        boolean esEstudianteDueno = "ESTUDIANTE".equalsIgnoreCase(current.getRol())
                && current.getPerfilId().equals(r.getEstudianteId());
        boolean esArrendadorDueno = "ARRENDADOR".equalsIgnoreCase(current.getRol())
                && current.getPerfilId().equals(r.getArrendadorId());
        if (!esEstudianteDueno && !esArrendadorDueno) {
            throw new IllegalStateException("No tienes permiso para cancelar esta reserva");
        }
        if (!ESTADOS_BLOQUEANTES.contains(r.getEstado())) {
            throw new IllegalStateException("La reserva no se puede cancelar en estado " + r.getEstado());
        }
        r.setEstado(EstadoReserva.CANCELADA);
        Reserva guardada = reservaRepository.save(r);
        emitirEvento("RESERVA_CANCELADA", guardada, current);
        return guardada;
    }

    @Transactional
    public Reserva finalizar(Long reservaId, CurrentUser current) {
        Reserva r = obtener(reservaId);
        validarArrendador(r, current);
        if (r.getEstado() != EstadoReserva.PAGADA) {
            throw new IllegalStateException("Solo se puede finalizar una reserva en estado PAGADA");
        }
        r.setEstado(EstadoReserva.FINALIZADA);
        return reservaRepository.save(r);
    }

    public List<Reserva> listarDelEstudiante(Long estudianteId) {
        return reservaRepository.findByEstudianteIdOrderByFechaCreacionDesc(estudianteId);
    }

    public List<Reserva> listarDelArrendador(Long arrendadorId) {
        return reservaRepository.findByArrendadorIdOrderByFechaCreacionDesc(arrendadorId);
    }

    public List<Reserva> listarDelArrendadorPorEstado(Long arrendadorId, EstadoReserva estado) {
        return reservaRepository.findByArrendadorIdAndEstadoOrderByFechaCreacionDesc(arrendadorId, estado);
    }

    // ===== Helpers =====

    private Reserva obtener(Long id) {
        return reservaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("No existe la reserva " + id));
    }

    private void validarArrendador(Reserva r, CurrentUser current) {
        if (current == null || current.getPerfilId() == null) {
            throw new IllegalStateException("Sin perfilId en contexto");
        }
        if (!"ARRENDADOR".equalsIgnoreCase(current.getRol())
                || !current.getPerfilId().equals(r.getArrendadorId())) {
            throw new IllegalStateException("Solo el arrendador dueño puede gestionar esta reserva");
        }
    }

    private BigDecimal calcularMonto(Propiedad p, CrearReservaRequest req) {
        long dias = ChronoUnit.DAYS.between(req.getFechaInicio(), req.getFechaFin()) + 1;
        if (dias <= 0) dias = 1;
        BigDecimal precio = p.getPrecio();
        PeriodoAlquiler periodo = p.getPeriodoAlquiler() != null ? p.getPeriodoAlquiler() : PeriodoAlquiler.MENSUAL;

        return switch (periodo) {
            case DIARIO -> precio.multiply(BigDecimal.valueOf(dias));
            case MENSUAL -> precio.multiply(BigDecimal.valueOf(dias))
                    .divide(BigDecimal.valueOf(30), 2, RoundingMode.HALF_UP);
            case SEMESTRAL -> precio.multiply(BigDecimal.valueOf(dias))
                    .divide(BigDecimal.valueOf(180), 2, RoundingMode.HALF_UP);
            case ANUAL -> precio.multiply(BigDecimal.valueOf(dias))
                    .divide(BigDecimal.valueOf(365), 2, RoundingMode.HALF_UP);
        };
    }

    private void emitirEvento(String tipo, Reserva r, CurrentUser current) {
        Map<String, Object> extra = new HashMap<>();
        extra.put("propiedadId", r.getPropiedadId());
        extra.put("estudianteId", r.getEstudianteId());
        extra.put("arrendadorId", r.getArrendadorId());
        extra.put("estado", r.getEstado().name());
        extra.put("montoTotal", r.getMontoTotal());
        if (r.getMotivoRechazo() != null) extra.put("motivo", r.getMotivoRechazo());

        try {
            EstudianteInfoDTO est = usuariosClient.obtenerEstudiante(r.getEstudianteId());
            if (est != null) {
                extra.put("estudianteNombre", est.getNombre() + " " + (est.getApellido() != null ? est.getApellido() : ""));
                extra.put("estudianteTelefono", est.getTelefono());
            }
        } catch (Exception e) {
            log.warn("No se pudo obtener info del estudiante {}: {}", r.getEstudianteId(), e.getMessage());
        }
        try {
            ArrendadorInfoDTO arr = usuariosClient.obtenerArrendador(r.getArrendadorId());
            if (arr != null) {
                extra.put("arrendadorNombre", arr.getNombre() + " " + (arr.getApellido() != null ? arr.getApellido() : ""));
                extra.put("arrendadorTelefono", arr.getTelefono());
            }
        } catch (Exception e) {
            log.warn("No se pudo obtener info del arrendador {}: {}", r.getArrendadorId(), e.getMessage());
        }

        reservaEventProducer.emitir(tipo, r.getId(), extra);
    }
}
