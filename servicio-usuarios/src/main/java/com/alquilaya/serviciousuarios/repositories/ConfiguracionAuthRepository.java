package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.ConfiguracionAuth;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConfiguracionAuthRepository extends JpaRepository<ConfiguracionAuth, Long> {
}
