package com.alquilaya.serviciousuarios.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Registro de intento de login (exitoso o fallido). Usado por
 * {@link com.alquilaya.serviciousuarios.services.LoginAttemptService} para
 * bloquear cuentas tras 5 fallos consecutivos en 15min.
 */
@Entity
@Table(
        name = "login_attempts",
        indexes = {
                @Index(name = "idx_login_attempt_correo_ts", columnList = "correo, ts DESC"),
                @Index(name = "idx_login_attempt_correo_exito", columnList = "correo, exito")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String correo;

    @Column(length = 45)
    private String ip;

    @Column(nullable = false, updatable = false)
    private LocalDateTime ts;

    @Column(nullable = false)
    private boolean exito;

    @PrePersist
    void onCreate() {
        if (ts == null) ts = LocalDateTime.now();
    }
}
