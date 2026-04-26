package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, Long> {

    long countByCorreoAndExitoFalseAndTsAfter(String correo, LocalDateTime after);
}
