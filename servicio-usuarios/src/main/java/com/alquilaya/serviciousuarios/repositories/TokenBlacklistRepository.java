package com.alquilaya.serviciousuarios.repositories;

import com.alquilaya.serviciousuarios.entities.TokenBlacklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Repository
public interface TokenBlacklistRepository extends JpaRepository<TokenBlacklist, Long> {

    /** Verifica si un hash SHA-256 está en la lista negra. */
    boolean existsByTokenHash(String tokenHash);

    /**
     * Elimina entradas cuya expiración ya pasó.
     * Llamado periódicamente para evitar crecimiento indefinido de la tabla.
     */
    @Modifying
    @Transactional
    void deleteByExpirationBefore(LocalDateTime now);
}
