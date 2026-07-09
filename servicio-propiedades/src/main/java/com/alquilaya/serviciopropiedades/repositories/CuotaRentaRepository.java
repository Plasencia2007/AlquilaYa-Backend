package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.CuotaRenta;
import com.alquilaya.serviciopropiedades.enums.EstadoCuota;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface CuotaRentaRepository extends JpaRepository<CuotaRenta, Long> {

    /** Cronograma completo de una reserva (para el endpoint de lectura). */
    List<CuotaRenta> findByReservaIdOrderByNumeroCuotaAsc(Long reservaId);

    /** Guarda de idempotencia usada por {@code generarCuotas}. */
    boolean existsByReservaIdAndNumeroCuota(Long reservaId, Integer numeroCuota);

    boolean existsByReservaId(Long reservaId);

    /**
     * Cuotas PENDIENTE cuyo vencimiento cae dentro de la ventana de recordatorio
     * ({@code fechaVencimiento <= limite}) y a las que aún no se emitió recordatorio.
     * Las usa {@code CuotaRentaScheduler} para avisar antes del vencimiento.
     */
    List<CuotaRenta> findByEstadoAndRecordatorioEnviadoFalseAndFechaVencimientoLessThanEqual(
            EstadoCuota estado, LocalDate limite);

    /**
     * Marca como VENCIDA toda cuota PENDIENTE cuyo vencimiento ya pasó. Bulk update:
     * no dispara callbacks de entidad. Idempotente (solo toca filas PENDIENTE).
     */
    @Modifying
    @Query("""
            UPDATE CuotaRenta c
               SET c.estado = com.alquilaya.serviciopropiedades.enums.EstadoCuota.VENCIDA
             WHERE c.estado = com.alquilaya.serviciopropiedades.enums.EstadoCuota.PENDIENTE
               AND c.fechaVencimiento < :hoy
            """)
    int marcarVencidas(@Param("hoy") LocalDate hoy);
}
