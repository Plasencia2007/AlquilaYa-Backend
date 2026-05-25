package com.alquilaya.serviciopropiedades.saga.repository;

import com.alquilaya.serviciopropiedades.saga.entity.EstadoSaga;
import com.alquilaya.serviciopropiedades.saga.entity.SagaReservaPago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SagaReservaPagoRepository extends JpaRepository<SagaReservaPago, UUID> {

    /** Saga vigente (no completada) para una reserva dada. */
    @Query("""
           SELECT s FROM SagaReservaPago s
            WHERE s.reservaId = :reservaId
              AND s.completedAt IS NULL
           """)
    Optional<SagaReservaPago> findActivaByReservaId(@Param("reservaId") Long reservaId);

    /** Cualquier saga (incluso completada) por reservaId — la última creada. */
    List<SagaReservaPago> findByReservaIdOrderByCreatedAtDesc(Long reservaId);

    /**
     * Sagas en estado COMPENSANDO con menos de N intentos. Usado por el scheduler
     * para reintentar la emisión de {@code REFUND_REQUERIDO}.
     */
    @Query("""
           SELECT s FROM SagaReservaPago s
            WHERE s.estadoSaga = :estado
              AND s.intentos < :maxIntentos
              AND s.completedAt IS NULL
            ORDER BY s.updatedAt ASC
           """)
    List<SagaReservaPago> findPendientesCompensacion(@Param("estado") EstadoSaga estado,
                                                     @Param("maxIntentos") int maxIntentos);
}
