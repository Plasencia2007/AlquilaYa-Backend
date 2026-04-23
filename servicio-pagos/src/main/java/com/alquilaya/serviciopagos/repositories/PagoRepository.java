package com.alquilaya.serviciopagos.repositories;

import com.alquilaya.serviciopagos.entities.Pago;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PagoRepository extends JpaRepository<Pago, Long> {
    Optional<Pago> findByReservaId(Long reservaId);
    Optional<Pago> findByPreferenciaId(String preferenciaId);
}
