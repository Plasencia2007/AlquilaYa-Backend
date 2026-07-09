package com.alquilaya.serviciopagos.repositories;

import com.alquilaya.serviciopagos.entities.Deposito;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepositoRepository extends JpaRepository<Deposito, Long> {
    List<Deposito> findByReservaIdOrderByFechaCreacionDesc(Long reservaId);
    List<Deposito> findByArrendadorIdOrderByFechaCreacionDesc(Long arrendadorId);
    Optional<Deposito> findFirstByReservaIdAndEstadoOrderByFechaCreacionDesc(Long reservaId, String estado);
}
