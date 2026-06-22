package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface ReservaRepository extends JpaRepository<Reserva, Long> {
    List<Reserva> findByEstudianteIdOrderByFechaCreacionDesc(Long estudianteId);

    List<Reserva> findByArrendadorIdOrderByFechaCreacionDesc(Long arrendadorId);

    List<Reserva> findByArrendadorIdAndEstadoOrderByFechaCreacionDesc(Long arrendadorId, EstadoReserva estado);

    List<Reserva> findByPropiedadIdAndEstadoIn(Long propiedadId, Collection<EstadoReserva> estados);

    /** Total de reservas de una propiedad (cualquier estado) — embudo de analítica. */
    long countByPropiedadId(Long propiedadId);

    /** Reserva más reciente de una propiedad (para la alerta "30 días sin reservas"). */
    Reserva findFirstByPropiedadIdOrderByFechaCreacionDesc(Long propiedadId);

    boolean existsByEstudianteIdAndPropiedadIdAndEstado(Long estudianteId, Long propiedadId, EstadoReserva estado);

    boolean existsByPropiedadIdAndEstadoInAndFechaInicioLessThanEqualAndFechaFinGreaterThanEqual(
            Long propiedadId, Collection<EstadoReserva> estados, LocalDate fechaFin, LocalDate fechaInicio);

    /** Solapamiento por habitación (propiedades gestionadas por habitaciones). */
    boolean existsByHabitacionIdAndEstadoInAndFechaInicioLessThanEqualAndFechaFinGreaterThanEqual(
            Long habitacionId, Collection<EstadoReserva> estados, LocalDate fechaFin, LocalDate fechaInicio);

    /** Reservas activas de una habitación (para el calendario por cuarto). */
    List<Reserva> findByHabitacionIdAndEstadoIn(Long habitacionId, Collection<EstadoReserva> estados);

    /**
     * Devuelve reservas en estado APROBADA cuya última actualización es anterior al corte.
     * Usado por {@code ReservaExpirationScheduler} para identificar reservas aprobadas
     * que el estudiante nunca llegó a pagar y deben pasar a EXPIRADA.
     */
    @Query("""
            SELECT r FROM Reserva r
            WHERE r.estado = com.alquilaya.serviciopropiedades.enums.EstadoReserva.APROBADA
              AND r.fechaActualizacion < :corte
            """)
    List<Reserva> findReservasAprobadasParaExpirar(@Param("corte") LocalDateTime corte);

    /**
     * Devuelve reservas PAGADA cuya estadía ya terminó (fechaFin anterior a hoy).
     * Usado por {@code ReservaFinalizacionScheduler} para cerrar el ciclo
     * automáticamente (PAGADA → FINALIZADA) y habilitar las reseñas.
     */
    @Query("""
            SELECT r FROM Reserva r
            WHERE r.estado = com.alquilaya.serviciopropiedades.enums.EstadoReserva.PAGADA
              AND r.fechaFin < :hoy
            """)
    List<Reserva> findPagadasParaFinalizar(@Param("hoy") LocalDate hoy);

    /**
     * Reservas APROBADA, aún sin recordatorio de pago, cuya aprobación
     * ({@code fechaActualizacion}) es anterior al corte. Usado por
     * {@code ReservaRecordatorioScheduler} para avisar antes de que expiren.
     */
    @Query("""
            SELECT r FROM Reserva r
            WHERE r.estado = com.alquilaya.serviciopropiedades.enums.EstadoReserva.APROBADA
              AND (r.recordatorioPagoEnviado IS NULL OR r.recordatorioPagoEnviado = false)
              AND r.fechaActualizacion < :corte
            """)
    List<Reserva> findAprobadasParaRecordatorio(@Param("corte") LocalDateTime corte);

    /**
     * Marca el recordatorio como enviado vía bulk update: evita el {@code @PreUpdate}
     * de la entidad, que reiniciaría {@code fechaActualizacion} (y con ella el reloj
     * de expiración). Sin {@code clearAutomatically} para no descartar el evento de
     * outbox que se persiste en la misma transacción.
     */
    @Modifying
    @Query("UPDATE Reserva r SET r.recordatorioPagoEnviado = true WHERE r.id = :id")
    int marcarRecordatorioPagoEnviado(@Param("id") Long id);
}
