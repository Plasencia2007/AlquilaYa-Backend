package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.dto.HabitacionRequest;
import com.alquilaya.serviciopropiedades.dto.HabitacionResponse;
import com.alquilaya.serviciopropiedades.entities.Habitacion;
import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoHabitacion;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.repositories.HabitacionRepository;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;

/**
 * CRUD de habitaciones de una propiedad gestionada por habitaciones. Tras cada cambio
 * denormaliza {@code propiedad.precio} al mínimo de sus habitaciones, para que la búsqueda
 * y el orden por precio (que operan a nivel propiedad) sigan funcionando como "desde S/X".
 */
@Service
@RequiredArgsConstructor
public class HabitacionService {

    private final HabitacionRepository habitacionRepository;
    private final PropiedadRepository propiedadRepository;
    private final ReservaRepository reservaRepository;

    /** Reservas que impiden eliminar una habitación. */
    private static final EnumSet<EstadoReserva> ESTADOS_RESERVA_ACTIVA =
            EnumSet.of(EstadoReserva.SOLICITADA, EstadoReserva.APROBADA, EstadoReserva.PAGADA);

    @Transactional(readOnly = true)
    public List<HabitacionResponse> listar(Long propiedadId) {
        return habitacionRepository.findByPropiedadIdOrderByOrdenAscIdAsc(propiedadId)
                .stream().map(HabitacionResponse::from).toList();
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
                .build();
        Habitacion guardada = habitacionRepository.save(h);
        sincronizarPrecioPropiedad(propiedadId);
        return HabitacionResponse.from(guardada);
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
        Habitacion guardada = habitacionRepository.save(h);
        sincronizarPrecioPropiedad(propiedadId);
        return HabitacionResponse.from(guardada);
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
