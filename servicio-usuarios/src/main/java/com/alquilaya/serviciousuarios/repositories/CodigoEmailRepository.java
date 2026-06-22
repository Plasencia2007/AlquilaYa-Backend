package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.CodigoEmail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface CodigoEmailRepository extends JpaRepository<CodigoEmail, Long> {

    Optional<CodigoEmail> findFirstByEmailOrderByFechaCreacionDesc(String email);

    long countByEmailAndFechaCreacionAfter(String email, LocalDateTime desde);
}
