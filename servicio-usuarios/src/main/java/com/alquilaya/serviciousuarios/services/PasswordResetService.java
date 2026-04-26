package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.config.JwtService;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import com.alquilaya.serviciousuarios.util.LogMask;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Maneja el flow de "olvidé mi contraseña":
 *  1. {@link #solicitarReset(String)} — busca usuario por correo, genera JWT
 *     corto (15min), envía email con link al frontend.
 *  2. {@link #resetear(String, String)} — valida JWT, actualiza password.
 *
 * Defensa contra enumeración de correos: {@link #solicitarReset} NO revela si
 * el correo existe; siempre se llama desde el controller con response 200
 * idempotente.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final UsuarioRepository usuarioRepository;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    /**
     * Si el correo existe, manda email con link de reset. Si no existe,
     * silenciosamente no hace nada. Devuelve void para no exponer información.
     */
    @Transactional(readOnly = true)
    public void solicitarReset(String correo) {
        if (correo == null || correo.isBlank()) return;

        Optional<Usuario> opt = usuarioRepository.findByCorreo(correo.trim().toLowerCase());
        if (opt.isEmpty()) {
            log.info("[PasswordReset] Correo no registrado: {} — silencioso", LogMask.email(correo));
            return;
        }

        Usuario u = opt.get();
        String token = jwtService.generatePasswordResetToken(u.getCorreo());

        // Best-effort: si Resend falla, log y seguir. El usuario igual ve "te enviamos un link".
        emailService.enviarResetPassword(u.getCorreo(), u.getNombre(), token);
        log.info("[PasswordReset] Solicitud procesada para {}", LogMask.email(u.getCorreo()));
    }

    /**
     * Valida el token y actualiza la contraseña del usuario asociado.
     * Lanza si el token es inválido, expirado o el usuario no existe.
     */
    @Transactional
    public void resetear(String token, String nuevaPassword) {
        String correo;
        try {
            correo = jwtService.validatePasswordResetToken(token);
        } catch (Exception e) {
            throw new IllegalArgumentException("El enlace de recuperación es inválido o expiró");
        }

        Usuario u = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new IllegalArgumentException("Cuenta no encontrada"));

        u.setPassword(passwordEncoder.encode(nuevaPassword));
        usuarioRepository.save(u);
        log.info("[PasswordReset] Password actualizada para {}", LogMask.email(correo));
    }
}
