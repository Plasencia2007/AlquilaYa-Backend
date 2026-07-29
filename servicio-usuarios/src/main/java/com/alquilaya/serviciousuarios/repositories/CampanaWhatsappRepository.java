package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.CampanaWhatsapp;
import com.alquilaya.serviciousuarios.enums.EstadoEnvioCampana;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CampanaWhatsappRepository extends JpaRepository<CampanaWhatsapp, Long> {

    Page<CampanaWhatsapp> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** Campañas programadas ya vencidas, para el poller ({@link EstadoEnvioCampana#PENDIENTE}). */
    List<CampanaWhatsapp> findByEstadoEnvioAndProgramadoParaLessThanEqualOrderByProgramadoParaAsc(
            EstadoEnvioCampana estadoEnvio, LocalDateTime ahora);
}
