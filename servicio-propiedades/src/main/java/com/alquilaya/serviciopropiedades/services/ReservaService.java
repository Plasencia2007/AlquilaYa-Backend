package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.clients.UsuariosClient;
import com.alquilaya.serviciopropiedades.config.CurrentUser;
import com.alquilaya.serviciopropiedades.dto.ArrendadorInfoDTO;
import com.alquilaya.serviciopropiedades.dto.CrearReservaRequest;
import com.alquilaya.serviciopropiedades.dto.EstudianteInfoDTO;
import com.alquilaya.serviciopropiedades.entities.Habitacion;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoHabitacion;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.enums.PoliticaCancelacion;
import com.alquilaya.serviciopropiedades.kafka.ReservaEventProducer;
import com.alquilaya.serviciopropiedades.repositories.HabitacionRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import com.alquilaya.serviciopropiedades.saga.service.SagaReservaPagoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
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
    private final HabitacionRepository habitacionRepository;
    private final HabitacionService habitacionService;
    private final UsuariosClient usuariosClient;
    private final ReservaEventProducer reservaEventProducer;
    private final SagaReservaPagoService sagaReservaPagoService;
    private final ComisionService comisionService;
    private final com.alquilaya.serviciopropiedades.repositories.PrecioTemporadaRepository precioTemporadaRepository;

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
        if (!req.getFechaFin().isAfter(req.getFechaInicio())) {
            throw new IllegalArgumentException(
                    "La fecha de fin debe ser al menos un día después de la fecha de inicio");
        }

        // Fail-safe: el estudiante debe tener sus documentos aprobados. Se valida
        // ANTES del lock pesimista para no retener el row-lock durante la llamada HTTP.
        EstudianteInfoDTO estudiante = usuariosClient.obtenerEstudiante(current.getPerfilId());
        if (estudiante == null) {
            throw new IllegalStateException(
                    "No pudimos validar tu estado de verificación en este momento. Inténtalo de nuevo en unos minutos.");
        }
        if (!Boolean.TRUE.equals(estudiante.getVerificado())) {
            throw new IllegalStateException(
                    "Debes verificar tu identidad antes de reservar. Sube tu DNI en Perfil > Verificación.");
        }

        // Lock pesimista: serializa creaciones concurrentes sobre la misma propiedad
        // para que la verificación de solapamiento de fechas no sufra race conditions.
        Propiedad propiedad = propiedadRepository.findByIdForUpdate(req.getPropiedadId())
                .orElseThrow(() -> new IllegalArgumentException("No existe la propiedad " + req.getPropiedadId()));

        if (propiedad.getAprobadoPorAdmin() == null || !propiedad.getAprobadoPorAdmin()) {
            throw new IllegalStateException("La propiedad no está aprobada y no se puede reservar");
        }
        if (Boolean.FALSE.equals(propiedad.getEstaDisponible())) {
            throw new IllegalStateException("La propiedad no está disponible");
        }

        // Resolución de la "unidad" reservada: el inmueble completo o una habitación concreta.
        Long habitacionId = null;
        BigDecimal precioBase;
        if (Boolean.TRUE.equals(propiedad.getGestionPorHabitacion())) {
            if (req.getHabitacionId() == null) {
                throw new IllegalArgumentException("Debes elegir una habitación para reservar este inmueble");
            }
            Habitacion hab = habitacionRepository
                    .findByIdAndPropiedadId(req.getHabitacionId(), propiedad.getId())
                    .orElseThrow(() -> new IllegalArgumentException("La habitación no existe en esta propiedad"));
            if (hab.getEstado() == EstadoHabitacion.MANTENIMIENTO) {
                throw new IllegalStateException("La habitación está en mantenimiento y no se puede reservar");
            }
            boolean solapada = reservaRepository
                    .existsByHabitacionIdAndEstadoInAndFechaInicioLessThanEqualAndFechaFinGreaterThanEqual(
                            hab.getId(), ESTADOS_BLOQUEANTES, req.getFechaFin(), req.getFechaInicio());
            if (solapada) {
                throw new IllegalStateException("Esa habitación ya está reservada en esas fechas");
            }
            habitacionId = hab.getId();
            precioBase = hab.getPrecio();
        } else {
            boolean solapada = reservaRepository
                    .existsByPropiedadIdAndEstadoInAndFechaInicioLessThanEqualAndFechaFinGreaterThanEqual(
                            propiedad.getId(), ESTADOS_BLOQUEANTES, req.getFechaFin(), req.getFechaInicio());
            if (solapada) {
                throw new IllegalStateException("Ya existe una reserva activa que se solapa con esas fechas");
            }
            // Precio por temporada/ciclo: si una temporada cubre el CHECK-IN, su precio manda.
            precioBase = precioTemporadaRepository
                    .findFirstByPropiedadIdAndFechaInicioLessThanEqualAndFechaFinGreaterThanEqualOrderByFechaInicioAsc(
                            propiedad.getId(), req.getFechaInicio(), req.getFechaInicio())
                    .map(com.alquilaya.serviciopropiedades.entities.PrecioTemporada::getPrecio)
                    .orElse(propiedad.getPrecio());
        }

        BigDecimal monto = calcularMonto(precioBase, propiedad.getPeriodoAlquiler(), req);

        Reserva reserva = Reserva.builder()
                .propiedadId(propiedad.getId())
                .habitacionId(habitacionId)
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
        Reserva r = obtenerPorId(reservaId);
        validarArrendador(r, current);
        if (r.getEstado() != EstadoReserva.SOLICITADA) {
            throw new IllegalStateException("Solo se pueden aprobar reservas en estado SOLICITADA");
        }
        r.setEstado(EstadoReserva.APROBADA);
        Reserva guardada = reservaRepository.save(r);
        emitirEvento("RESERVA_APROBADA", guardada, current);
        habitacionService.recomputarTrasCambioReserva(guardada);
        // Ola 3 — Saga orquestada: al aprobarse la reserva se inicia el seguimiento del
        // ciclo de pago para detectar inconsistencias (refund automático si llega un pago
        // tardío sobre una reserva ya cancelada, o cancelación post-pago).
        sagaReservaPagoService.iniciarSaga(guardada.getId());
        return guardada;
    }

    @Transactional
    public Reserva rechazar(Long reservaId, String motivo, CurrentUser current) {
        Reserva r = obtenerPorId(reservaId);
        validarArrendador(r, current);
        if (r.getEstado() != EstadoReserva.SOLICITADA) {
            throw new IllegalStateException("Solo se pueden rechazar reservas en estado SOLICITADA");
        }
        r.setEstado(EstadoReserva.RECHAZADA);
        r.setMotivoRechazo(motivo);
        Reserva guardada = reservaRepository.save(r);
        emitirEvento("RESERVA_RECHAZADA", guardada, current);
        habitacionService.recomputarTrasCambioReserva(guardada);
        return guardada;
    }

    @Transactional
    public Reserva marcarPagada(Long reservaId) {
        Reserva r = obtenerPorId(reservaId);
        if (r.getEstado() != EstadoReserva.APROBADA) {
            throw new IllegalStateException("Solo se pueden marcar como PAGADAS reservas APROBADAS");
        }
        r.setEstado(EstadoReserva.PAGADA);
        Reserva guardada = reservaRepository.save(r);
        emitirEvento("RESERVA_PAGADA", guardada, null);
        habitacionService.recomputarTrasCambioReserva(guardada);
        return guardada;
    }

    @Transactional
    public Reserva cancelar(Long reservaId, String motivo, CurrentUser current) {
        Reserva r = obtenerPorId(reservaId);
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
        EstadoReserva estadoPrevio = r.getEstado();
        r.setEstado(EstadoReserva.CANCELADA);
        r.setMotivoCancelacion(motivo);
        Reserva guardada = reservaRepository.save(r);
        emitirEvento("RESERVA_CANCELADA", guardada, current);
        habitacionService.recomputarTrasCambioReserva(guardada);
        // Ola 3 — Si se cancela una reserva APROBADA (pago en curso) o PAGADA, hay
        // que emitir REFUND_REQUERIDO al servicio-pagos para reembolsar en MP.
        if (estadoPrevio == EstadoReserva.PAGADA) {
            // Política de cancelación: solo se reembolsa si se cancela con suficiente
            // anticipación al check-in. Si no, no se emite el REFUND (cancelación tardía).
            if (corresponderReembolso(guardada)) {
                sagaReservaPagoService.manejarCancelacionReserva(guardada.getId());
            } else {
                log.info("[CANCELACION] Reserva {} cancelada SIN reembolso por política de la propiedad "
                        + "(cancelación tardía respecto al check-in {})", guardada.getId(), guardada.getFechaInicio());
            }
        } else if (estadoPrevio == EstadoReserva.APROBADA) {
            // Aún no hay pago confirmado; el saga no-opea si no hay nada que reembolsar.
            sagaReservaPagoService.manejarCancelacionReserva(guardada.getId());
        }
        return guardada;
    }

    /**
     * Decide si una cancelación PAGADA corresponde reembolso, según la política de la
     * propiedad y los días de anticipación al check-in. Si no encuentra la propiedad o
     * la política es null, asume FLEXIBLE (reembolso completo) por compatibilidad.
     */
    private boolean corresponderReembolso(Reserva r) {
        PoliticaCancelacion pol = propiedadRepository.findById(r.getPropiedadId())
                .map(Propiedad::getPoliticaCancelacion)
                .orElse(PoliticaCancelacion.FLEXIBLE);
        if (pol == null) pol = PoliticaCancelacion.FLEXIBLE;
        long diasHastaCheckIn = r.getFechaInicio() != null
                ? ChronoUnit.DAYS.between(LocalDate.now(), r.getFechaInicio())
                : 0;
        return pol.permiteReembolso(diasHastaCheckIn);
    }

    @Transactional
    public Reserva finalizar(Long reservaId, CurrentUser current) {
        Reserva r = obtenerPorId(reservaId);
        validarArrendador(r, current);
        if (r.getEstado() != EstadoReserva.PAGADA) {
            throw new IllegalStateException("Solo se puede finalizar una reserva en estado PAGADA");
        }
        r.setEstado(EstadoReserva.FINALIZADA);
        Reserva guardada = reservaRepository.save(r);
        emitirEvento("RESERVA_FINALIZADA", guardada, current);
        habitacionService.recomputarTrasCambioReserva(guardada);
        return guardada;
    }

    /**
     * Finaliza automáticamente una reserva PAGADA cuya estadía ya terminó.
     * Acción del sistema (no la dispara el arrendador), por eso no valida
     * ownership. Idempotente: si la reserva ya no está PAGADA o la fecha aún no
     * venció, no hace nada. La usa {@code ReservaFinalizacionScheduler}.
     *
     * @return true si transicionó a FINALIZADA.
     */
    @Transactional
    public boolean finalizarVencida(Long reservaId) {
        Reserva r = obtenerPorId(reservaId);
        if (r.getEstado() != EstadoReserva.PAGADA) {
            return false;
        }
        if (r.getFechaFin() == null || !r.getFechaFin().isBefore(LocalDate.now())) {
            return false;
        }
        if (!r.getEstado().puedeTransicionarA(EstadoReserva.FINALIZADA)) {
            return false;
        }
        r.setEstado(EstadoReserva.FINALIZADA);
        Reserva guardada = reservaRepository.save(r);
        // Emisión directa sin enriquecimiento Feign: el scheduler corre sin
        // request context, así que el header Authorization no se propagaría.
        // El consumidor de notificaciones solo necesita estudianteId + reservaId.
        Map<String, Object> extra = new HashMap<>();
        extra.put("propiedadId", guardada.getPropiedadId());
        extra.put("estudianteId", guardada.getEstudianteId());
        extra.put("arrendadorId", guardada.getArrendadorId());
        extra.put("estado", guardada.getEstado().name());
        extra.put("montoTotal", guardada.getMontoTotal());
        reservaEventProducer.emitir("RESERVA_FINALIZADA", guardada.getId(), extra);
        habitacionService.recomputarTrasCambioReserva(guardada);
        log.info("[FINALIZACION] Reserva {} FINALIZADA automáticamente (fechaFin={})",
                guardada.getId(), guardada.getFechaFin());
        return true;
    }

    /**
     * Emite un recordatorio de pago para una reserva APROBADA cercana a expirar.
     * Acción del sistema (sin request context), por eso emite sin enriquecimiento
     * Feign. Idempotente: si ya no está APROBADA o ya se recordó, no hace nada.
     * Marca el flag con bulk update para NO reiniciar {@code fechaActualizacion}
     * (que es el reloj de expiración).
     *
     * @return true si se emitió el recordatorio.
     */
    @Transactional
    public boolean enviarRecordatorioPago(Long reservaId) {
        Reserva r = obtenerPorId(reservaId);
        if (r.getEstado() != EstadoReserva.APROBADA) {
            return false;
        }
        if (Boolean.TRUE.equals(r.getRecordatorioPagoEnviado())) {
            return false;
        }
        Map<String, Object> extra = new HashMap<>();
        extra.put("propiedadId", r.getPropiedadId());
        extra.put("estudianteId", r.getEstudianteId());
        extra.put("arrendadorId", r.getArrendadorId());
        extra.put("estado", r.getEstado().name());
        reservaEventProducer.emitir("RESERVA_PAGO_PENDIENTE", r.getId(), extra);
        reservaRepository.marcarRecordatorioPagoEnviado(r.getId());
        log.info("[RECORDATORIO] Recordatorio de pago emitido para reserva {}", r.getId());
        return true;
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

    public Reserva obtenerPorId(Long id) {
        return reservaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("No existe la reserva " + id));
    }

    /**
     * Obtiene una reserva validando que el solicitante sea un participante
     * (estudiante o arrendador dueño) o un ADMIN. Evita IDOR en GET /reservas/{id}.
     */
    public Reserva obtenerPropia(Long id, CurrentUser current) {
        Reserva r = obtenerPorId(id);
        validarParticipante(r, current);
        return r;
    }

    private void validarParticipante(Reserva r, CurrentUser current) {
        if (current == null || current.getPerfilId() == null) {
            throw new IllegalStateException("Sin perfilId en contexto");
        }
        if ("ADMIN".equalsIgnoreCase(current.getRol())) {
            return;
        }
        boolean esEstudianteDueno = "ESTUDIANTE".equalsIgnoreCase(current.getRol())
                && current.getPerfilId().equals(r.getEstudianteId());
        boolean esArrendadorDueno = "ARRENDADOR".equalsIgnoreCase(current.getRol())
                && current.getPerfilId().equals(r.getArrendadorId());
        if (!esEstudianteDueno && !esArrendadorDueno) {
            throw new IllegalStateException("No tienes permiso para ver esta reserva");
        }
    }

    public String obtenerTituloPropiedad(Long propiedadId) {
        return propiedadRepository.findById(propiedadId)
                .map(Propiedad::getTitulo)
                .orElse("Propiedad");
    }

    /**
     * Comisión de plataforma para una venta de la propiedad dada sobre {@code montoTotal},
     * según la zona en la que cae. 0 si la propiedad no tiene zona o la zona no cobra comisión.
     */
    public BigDecimal calcularComision(Long propiedadId, BigDecimal montoTotal) {
        Long zonaId = propiedadRepository.findById(propiedadId)
                .map(Propiedad::getZonaId)
                .orElse(null);
        return comisionService.calcular(zonaId, montoTotal);
    }

    public EstudianteInfoDTO obtenerInfoEstudiante(Long estudianteId) {
        return usuariosClient.obtenerEstudiante(estudianteId);
    }

    /**
     * Actualización restringida: solo permite cambiar estado (respetando la máquina de estados)
     * y motivoRechazo. Propiedad/estudiante/arrendador/fechas/monto se fijan en la creación
     * y NO deben mutarse — cada flujo de negocio tiene su endpoint propio (aprobar, rechazar,
     * cancelar, finalizar) para transiciones específicas.
     */
    @Transactional
    public Reserva actualizarReserva(Long id, Reserva updates, CurrentUser current) {
        Reserva r = obtenerPorId(id);
        // Anti-IDOR: solo el arrendador dueño (o un admin) puede mutar esta reserva.
        validarGestorReserva(r, current);

        if (updates.getEstado() != null && updates.getEstado() != r.getEstado()) {
            if (!r.getEstado().puedeTransicionarA(updates.getEstado())) {
                throw new IllegalStateException(
                        "Transición no permitida: " + r.getEstado() + " → " + updates.getEstado());
            }
            r.setEstado(updates.getEstado());
        }

        if (updates.getMotivoRechazo() != null) {
            r.setMotivoRechazo(updates.getMotivoRechazo());
        }

        return reservaRepository.save(r);
    }

    @Transactional
    public void eliminarReserva(Long id, CurrentUser current) {
        Reserva r = obtenerPorId(id);
        // Anti-IDOR: solo el arrendador dueño (o un admin) puede eliminar esta reserva.
        validarGestorReserva(r, current);
        reservaRepository.delete(r);
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

    /** Como {@link #validarArrendador} pero también admite ADMIN (gestión/soporte). */
    private void validarGestorReserva(Reserva r, CurrentUser current) {
        if (current == null || current.getPerfilId() == null) {
            throw new IllegalStateException("Sin perfilId en contexto");
        }
        if ("ADMIN".equalsIgnoreCase(current.getRol())) {
            return;
        }
        if (!"ARRENDADOR".equalsIgnoreCase(current.getRol())
                || !current.getPerfilId().equals(r.getArrendadorId())) {
            throw new IllegalStateException("Solo el arrendador dueño o un admin puede gestionar esta reserva");
        }
    }

    private BigDecimal calcularMonto(Propiedad p, CrearReservaRequest req) {
        return calcularMonto(p.getPrecio(), p.getPeriodoAlquiler(), req);
    }

    /**
     * Calcula el monto de la reserva. El precio se trata como MENSUAL — toda la UI lo asume así
     * (ficha "/mes", y el formulario cobra precio × meses). Cobramos por MESES COMPLETOS para que
     * coincida exactamente con lo que muestra el formulario: "1 mes = 1 × precio" (sin prorrateo
     * por día, que daba totales raros como S/1.03 o, con el divisor por período, S/0.17).
     * {@code periodoRaw} queda como descriptor del aviso; ya no divide el precio.
     */
    private BigDecimal calcularMonto(BigDecimal precio, String periodoRaw, CrearReservaRequest req) {
        long dias = ChronoUnit.DAYS.between(req.getFechaInicio(), req.getFechaFin()) + 1;
        // El formulario fija la duración en meses (fechaFin = fechaInicio + N meses); reconstruimos N.
        long meses = Math.max(1, Math.round(dias / 30.0));
        return precio.multiply(BigDecimal.valueOf(meses)).setScale(2, RoundingMode.HALF_UP);
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
