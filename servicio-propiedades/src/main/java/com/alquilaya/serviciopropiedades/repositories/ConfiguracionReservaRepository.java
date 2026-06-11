package com.alquilaya.serviciopropiedades.repositories;

import com.alquilaya.serviciopropiedades.entities.ConfiguracionReserva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConfiguracionReservaRepository extends JpaRepository<ConfiguracionReserva, Long> {
}
