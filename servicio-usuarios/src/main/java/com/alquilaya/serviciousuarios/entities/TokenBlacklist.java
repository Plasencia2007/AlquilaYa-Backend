package com.alquilaya.serviciousuarios.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Registro de tokens JWT revocados antes de su expiración natural.
 * Almacena el hash SHA-256 del token para evitar guardar el JWT completo.
 * Usado por {@link com.alquilaya.serviciousuarios.config.JwtService} para
 * invalidar sesiones en logout o suspensión de cuenta.
 */
@Entity
@Table(name = "token_blacklist")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenBlacklist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** SHA-256 del token JWT en hexadecimal (64 caracteres). */
    @Column(name = "token_hash", length = 64, unique = true, nullable = false)
    private String tokenHash;

    /** Fecha/hora de expiración original del token. Usada para limpiezas periódicas. */
    @Column(nullable = false)
    private LocalDateTime expiration;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
