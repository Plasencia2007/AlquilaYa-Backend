package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.dto.HabitacionRequest;
import com.alquilaya.serviciopropiedades.dto.HabitacionResponse;
import com.alquilaya.serviciopropiedades.dto.EstudianteInfoDTO;
import com.alquilaya.serviciopropiedades.clients.UsuariosClient;
import com.alquilaya.serviciopropiedades.entities.Habitacion;
import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoHabitacion;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.repositories.HabitacionRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;

/**
 * CRUD de habitaciones de una propiedad gestionada por habitaciones. Tras cada cambio
 * denormaliza {@code propiedad.precio} al mínimo de sus habitaciones, para que la búsqueda
 * y el orden por precio (que operan a nivel propiedad) sigan funcionando como "desde S/X".
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HabitacionService {

    private final HabitacionRepository habitacionRepository;
    private final PropiedadRepository propiedadRepository;
    private final ReservaRepository reservaRepository;
    private final KafkaProducerService kafkaProducerService;
    private final UsuariosClient usuariosClient;
    private final CloudinaryService cloudinaryService;
    private final CloudinaryCleanupQueueService cloudinaryCleanupQueue;

    /** Reservas que cuentan como "completadas" / "fallidas" para el score de reputación (#26). */
    private static final EnumSet<EstadoReserva> RESERVAS_COMPLETADAS = EnumSet.of(EstadoReserva.FINALIZADA);
    private static final EnumSet<EstadoReserva> RESERVAS_FALLIDAS =
            EnumSet.of(EstadoReserva.CANCELADA, EstadoReserva.EXPIRADA);

    /** Reservas que impiden eliminar una habitación. */
    private static final EnumSet<EstadoReserva> ESTADOS_RESERVA_ACTIVA =
            EnumSet.of(EstadoReserva.SOLICITADA, EstadoReserva.APROBADA, EstadoReserva.PAGADA);

    /**
     * Reservas que ocupan una UNIDAD COMPLETA (no gestionada por habitaciones): una vez
     * aprobada o pagada, la propiedad deja de estar disponible. SOLICITADA no bloquea
     * (varios estudiantes pueden solicitar antes de que el arrendador apruebe una).
     */
    private static final EnumSet<EstadoReserva> ESTADOS_OCUPAN_UNIDAD =
            EnumSet.of(EstadoReserva.APROBADA, EstadoReserva.PAGADA);

    @Transactional(readOnly = true)
    public List<HabitacionResponse> listar(Long propiedadId) {
        return habitacionRepository.findByPropiedadIdOrderByOrdenAscIdAsc(propiedadId)
                .stream().map(this::toResponseEnriched).toList();
    }

    private HabitacionResponse toResponseEnriched(Habitacion h) {
        HabitacionResponse res = HabitacionResponse.from(h);
        if (h.getEstado() == EstadoHabitacion.OCUPADA) {
            List<Reserva> pagadas = reservaRepository.findByHabitacionIdAndEstadoIn(h.getId(), List.of(EstadoReserva.PAGADA));
            LocalDate hoy = LocalDate.now();
            pagadas.stream()
                .filter(r -> (r.getFechaInicio() == null || !r.getFechaInicio().isAfter(hoy))
                        && (r.getFechaFin() == null || !r.getFechaFin().isBefore(hoy)))
                .findFirst()
                .ifPresent(reserva -> {
                    try {
                        EstudianteInfoDTO est = usuariosClient.obtenerEstudiante(reserva.getEstudianteId());
                        if (est != null) {
                            est.setCorreo(null);
                            est.setTelefono(null);
                            res.setOcupante(est);
                        }
                    } catch (Exception e) {
                        // fallback silenciador
                    }
                });
        }
        return res;
    }

    @Transactional
    public HabitacionResponse crear(Long propiedadId, HabitacionRequest req) {
        Habitacion h = Habitacion.builder()
                .propiedadId(propiedadId)
                .nombre(req.getNombre().trim())
                .precio(req.getPrecio())
                .estado(req.getEstado() != null ? req.getEstado() : EstadoHabitacion.LIBRE)
                .area(req.getArea())
                .descripcion(trimOrNull(req.getDescripcion()))
                .orden(req.getOrden() != null ? req.getOrden() : 0)
                .imagenes(req.getImagenes() != null ? new ArrayList<>(req.getImagenes()) : new ArrayList<>())
                .build();
        Habitacion guardada = habitacionRepository.save(h);
        sincronizarPrecioPropiedad(propiedadId);
        return toResponseEnriched(guardada);
    }

    @Transactional
    public HabitacionResponse actualizar(Long propiedadId, Long id, HabitacionRequest req) {
        Habitacion h = habitacionRepository.findByIdAndPropiedadId(id, propiedadId)
                .orElseThrow(() -> new EntityNotFoundException("Habitación no encontrada"));
        h.setNombre(req.getNombre().trim());
        h.setPrecio(req.getPrecio());
        if (req.getEstado() != null) h.setEstado(req.getEstado());
        h.setArea(req.getArea());
        h.setDescripcion(trimOrNull(req.getDescripcion()));
        if (req.getOrden() != null) h.setOrden(req.getOrden());
        if (req.getImagenes() != null) {
            h.setImagenes(new ArrayList<>(req.getImagenes()));
        }
        Habitacion guardada = habitacionRepository.save(h);
        sincronizarPrecioPropiedad(propiedadId);
        return toResponseEnriched(guardada);
    }

    @Transactional
    public void eliminar(Long propiedadId, Long id) {
        Habitacion h = habitacionRepository.findByIdAndPropiedadId(id, propiedadId)
                .orElseThrow(() -> new EntityNotFoundException("Habitación no encontrada"));
        boolean conReservasActivas = !reservaRepository
                .findByHabitacionIdAndEstadoIn(id, ESTADOS_RESERVA_ACTIVA).isEmpty();
        if (conReservasActivas) {
            throw new IllegalStateException(
                    "No se puede eliminar la habitación: tiene reservas activas (solicitadas/aprobadas/pagadas).");
        }
        // Limpieza best-effort de las fotos propias de la habitación en Cloudinary (#167) —
        // mismo patrón que PropiedadController#eliminarPropiedad: la cascada de BD borra las
        // filas de habitacion_imagenes, pero no los archivos reales, que quedarían huérfanos.
        for (String url : h.getImagenes()) {
            if (url == null || url.isBlank()) continue;
            try {
                cloudinaryService.eliminarPorUrl(url);
            } catch (Exception e) {
                log.warn("[DELETE-HABITACION] Fallo borrando foto {} en Cloudinary, encolando: {}", url, e.getMessage());
                cloudinaryCleanupQueue.encolar(url);
            }
        }
        habitacionRepository.delete(h);
        sincronizarPrecioPropiedad(propiedadId);
    }

    /**
     * Recalcula el estado de una habitación a partir de sus reservas activas (auto-sync con el
     * ciclo de reserva): OCUPADA si tiene un pago, RESERVADA si tiene una aprobación, LIBRE si no.
     * Respeta {@code MANTENIMIENTO} (bloqueo manual del arrendador, no se pisa). Es idempotente,
     * así que puede llamarse tras cualquier transición de reserva (aprobar/pagar/cancelar/expirar).
     */
    @Transactional
    public void recomputarEstado(Long habitacionId) {
        if (habitacionId == null) return;
        habitacionRepository.findById(habitacionId).ifPresent(h -> {
            if (h.getEstado() == EstadoHabitacion.MANTENIMIENTO) {
                return;
            }
            List<Reserva> activas = reservaRepository
                    .findByHabitacionIdAndEstadoIn(habitacionId, ESTADOS_RESERVA_ACTIVA);
            EstadoHabitacion nuevo;
            if (activas.stream().anyMatch(r -> r.getEstado() == EstadoReserva.PAGADA)) {
                nuevo = EstadoHabitacion.OCUPADA;
            } else if (activas.stream().anyMatch(r -> r.getEstado() == EstadoReserva.APROBADA)) {
                nuevo = EstadoHabitacion.RESERVADA;
            } else {
                nuevo = EstadoHabitacion.LIBRE;
            }
            if (h.getEstado() != nuevo) {
                h.setEstado(nuevo);
                habitacionRepository.save(h);
            }
        });
    }

    /**
     * Recalcula estado de habitación + disponibilidad de la propiedad de una sola vez.
     * Llamar tras CUALQUIER transición de reserva (crear/aprobar/pagar/cancelar/expirar/finalizar),
     * así una propiedad reservada/ocupada deja de aparecer en la búsqueda y vuelve al liberarse.
     */
    @Transactional
    public void recomputarTrasCambioReserva(Reserva reserva) {
        if (reserva == null) return;
        recomputarEstado(reserva.getHabitacionId());
        recomputarDisponibilidadPropiedad(reserva.getPropiedadId());
        emitirActividadReputacion(reserva);
    }

    /**
     * Emite las métricas de actividad (reservas completadas/fallidas) del arrendador y del
     * estudiante de la reserva, para que servicio-usuarios alimente el score agregado (#26).
     * Va en la misma transacción (outbox), así que es atómico con el cambio de estado.
     */
    private void emitirActividadReputacion(Reserva reserva) {
        if (reserva.getArrendadorId() != null) {
            long comp = reservaRepository.countByArrendadorIdAndEstadoIn(reserva.getArrendadorId(), RESERVAS_COMPLETADAS);
            long fall = reservaRepository.countByArrendadorIdAndEstadoIn(reserva.getArrendadorId(), RESERVAS_FALLIDAS);
            kafkaProducerService.enviarActividadArrendador(reserva.getArrendadorId(), comp, fall);
        }
        if (reserva.getEstudianteId() != null) {
            long comp = reservaRepository.countByEstudianteIdAndEstadoIn(reserva.getEstudianteId(), RESERVAS_COMPLETADAS);
            long fall = reservaRepository.countByEstudianteIdAndEstadoIn(reserva.getEstudianteId(), RESERVAS_FALLIDAS);
            kafkaProducerService.enviarActividadEstudiante(reserva.getEstudianteId(), comp, fall);
        }
    }

    /**
     * Recalcula {@code propiedad.estaDisponible} para que reservadas/ocupadas no aparezcan en el
     * listado público (el endpoint {@code /buscar} filtra por disponible por defecto):
     *  - Gestión por habitación: disponible si queda al menos una habitación LIBRE.
     *  - Unidad completa: disponible si NO hay reserva APROBADA/PAGADA vigente.
     * Idempotente: solo escribe si el valor cambió.
     */
    @Transactional
    public void recomputarDisponibilidadPropiedad(Long propiedadId) {
        if (propiedadId == null) return;
        propiedadRepository.findById(propiedadId).ifPresent(p -> {
            boolean disponible;
            if (Boolean.TRUE.equals(p.getGestionPorHabitacion())) {
                List<Habitacion> habs = habitacionRepository.findByPropiedadIdOrderByOrdenAscIdAsc(propiedadId);
                disponible = habs.isEmpty()
                        || habs.stream().anyMatch(h -> h.getEstado() == EstadoHabitacion.LIBRE);
            } else {
                boolean ocupada = !reservaRepository
                        .findByPropiedadIdAndEstadoIn(propiedadId, ESTADOS_OCUPAN_UNIDAD).isEmpty();
                disponible = !ocupada;
            }
            if (!Objects.equals(p.getEstaDisponible(), disponible)) {
                p.setEstaDisponible(disponible);
                propiedadRepository.save(p);
            }
        });
    }

    private void sincronizarPrecioPropiedad(Long propiedadId) {
        List<Habitacion> habs = habitacionRepository.findByPropiedadIdOrderByOrdenAscIdAsc(propiedadId);
        if (habs.isEmpty()) return;
        BigDecimal min = habs.stream()
                .map(Habitacion::getPrecio)
                .filter(Objects::nonNull)
                .min(BigDecimal::compareTo)
                .orElse(null);
        if (min != null) {
            propiedadRepository.findById(propiedadId).ifPresent(p -> {
                p.setPrecio(min);
                propiedadRepository.save(p);
            });
        }
    }

    private String trimOrNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
