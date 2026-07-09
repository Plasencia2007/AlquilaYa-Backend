package com.alquilaya.serviciopagos.repositories;

import com.alquilaya.serviciopagos.entities.Pago;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PagoRepository extends JpaRepository<Pago, Long> {
    Optional<Pago> findByReservaId(Long reservaId);
    Optional<Pago> findByPreferenciaId(String preferenciaId);
    Optional<Pago> findByPaymentId(String paymentId);
    Optional<Pago> findFirstByReservaIdAndEstadoOrderByFechaCreacionDesc(Long reservaId, String estado);
    /** Cuota de un miembro en una reserva grupal (#38 Fase 2). */
    Optional<Pago> findFirstByReservaIdAndEstudianteIdAndEstadoOrderByFechaCreacionDesc(
            Long reservaId, Long estudianteId, String estado);
    Optional<Pago> findFirstByReservaIdOrderByFechaCreacionDesc(Long reservaId);
    List<Pago> findAllByReservaIdOrderByFechaCreacionDesc(Long reservaId);
    List<Pago> findByEstado(String estado);

    /**
     * Reconciliación (G5): pagos en los estados dados, más antiguos primero, con límite
     * ({@link Pageable}). Alimenta el job que re-consulta Mercado Pago como fuente de verdad.
     */
    @Query("SELECT p FROM Pago p WHERE p.estado IN :estados ORDER BY p.fechaCreacion ASC")
    List<Pago> findByEstadoInOrderByFechaCreacionAsc(@Param("estados") Collection<String> estados,
                                                     Pageable pageable);

    // ===== G1: payout al arrendador =====

    /** Arrendadores con saldo pendiente de desembolso (pagos PAGADO, aún no cubiertos por un desembolso). */
    @Query("""
            SELECT p.arrendadorId, SUM(p.montoArrendador) FROM Pago p
            WHERE p.estado = 'PAGADO' AND p.desembolsoId IS NULL AND p.arrendadorId IS NOT NULL
            GROUP BY p.arrendadorId
            HAVING SUM(p.montoArrendador) > 0
            ORDER BY SUM(p.montoArrendador) DESC
            """)
    List<Object[]> resumenPendientePorArrendador();

    /** Saldo pendiente de UN arrendador específico (para generar su desembolso). */
    @Query("""
            SELECT COALESCE(SUM(p.montoArrendador), 0) FROM Pago p
            WHERE p.estado = 'PAGADO' AND p.desembolsoId IS NULL AND p.arrendadorId = :arrendadorId
            """)
    BigDecimal saldoPendiente(@Param("arrendadorId") Long arrendadorId);

    List<Pago> findByArrendadorIdAndEstadoAndDesembolsoIdIsNull(Long arrendadorId, String estado);

    List<Pago> findByDesembolsoId(Long desembolsoId);

    @Modifying
    @Transactional
    @Query("UPDATE Pago p SET p.desembolsoId = :desembolsoId WHERE p.id IN :ids")
    void marcarCubiertosPorDesembolso(@Param("ids") List<Long> ids, @Param("desembolsoId") Long desembolsoId);

    @Modifying
    @Transactional
    @Query("UPDATE Pago p SET p.desembolsoId = NULL WHERE p.desembolsoId = :desembolsoId")
    void liberarDesembolso(@Param("desembolsoId") Long desembolsoId);
}
