package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {
    Optional<OtpVerification> findFirstByTelefonoOrderByFechaCreacionDesc(String telefono);

    long countByTelefonoAndFechaCreacionAfter(String telefono, LocalDateTime after);
}
