package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.DuplicadoRevisado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DuplicadoRevisadoRepository extends JpaRepository<DuplicadoRevisado, Long> {

    boolean existsByCriterioAndValor(String criterio, String valor);
}
