package com.alquilaya.serviciousuarios.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Código de verificación de correo (6 dígitos) enviado por email. Mismo modelo que el OTP
 * de WhatsApp pero por canal email: el código se guarda HASHEADO (un dump de BD no expone
 * códigos válidos durante su ventana de vida).
 */
@Entity
@Table(name = "codigos_email", indexes = {
        @Index(name = "idx_codigo_email", columnList = "email")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodigoEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    /** Hash BCrypt del código (no texto plano). */
    @Column(nullable = false, length = 100)
    private String codigo;

    @Column(nullable = false)
    private LocalDateTime fechaExpiracion;

    @Builder.Default
    private boolean utilizado = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime fechaCreacion;

    public boolean isExpirado() {
        return LocalDateTime.now().isAfter(fechaExpiracion);
    }
}
