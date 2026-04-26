package com.alquilaya.serviciopagos.repositories;

import com.alquilaya.serviciopagos.entities.Pago;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PagoRepository extends JpaRepository<Pago, Long> {
    Optional<Pago> findByReservaId(Long reservaId);
    Optional<Pago> findByPreferenciaId(String preferenciaId);
    Optional<Pago> findByPaymentId(String paymentId);
    Optional<Pago> findFirstByReservaIdAndEstadoOrderByFechaCreacionDesc(Long reservaId, String estado);
    List<Pago> findAllByReservaIdOrderByFechaCreacionDesc(Long reservaId);
}
