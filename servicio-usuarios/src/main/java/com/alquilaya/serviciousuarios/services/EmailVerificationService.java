package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.entities.CodigoEmail;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.repositories.CodigoEmailRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import com.alquilaya.serviciousuarios.util.LogMask;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Verificación de correo por CÓDIGO de 6 dígitos enviado por email (#3) — misma UX que el
 * OTP de WhatsApp, distinto canal. El código se guarda hasheado (BCrypt). No es gate de
 * login por sí mismo: el gate lo decide {@link ConfiguracionAuthService}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int VIGENCIA_MINUTOS = 15;

    private final UsuarioRepository usuarioRepository;
    private final CodigoEmailRepository codigoEmailRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    /** Si el correo existe y aún no está verificado, genera y envía un código. Silencioso si no. */
    @Transactional
    public void solicitar(String correo) {
        if (correo == null || correo.isBlank()) return;
        Optional<Usuario> opt = usuarioRepository.findByCorreo(correo.trim().toLowerCase());
        if (opt.isEmpty()) {
            log.info("[EmailVerif] Correo no registrado: {} — silencioso", LogMask.email(correo));
            return;
        }
        Usuario u = opt.get();
        if (u.isEmailVerificado()) {
            log.info("[EmailVerif] {} ya verificado — no se reenvía", LogMask.email(u.getCorreo()));
            return;
        }
        enviar(u);
    }

    /** Genera un código, lo guarda hasheado y lo envía por email. Reutilizable desde el registro. */
    @Transactional
    public void enviar(Usuario u) {
        String codigo = String.format("%06d", RANDOM.nextInt(1_000_000));
        codigoEmailRepository.save(CodigoEmail.builder()
                .email(u.getCorreo())
                .codigo(passwordEncoder.encode(codigo))
                .fechaExpiracion(LocalDateTime.now().plusMinutes(VIGENCIA_MINUTOS))
                .build());
        emailService.enviarCodigoVerificacion(u.getCorreo(), u.getNombre(), codigo);
        log.info("[EmailVerif] Código enviado a {}", LogMask.email(u.getCorreo()));
    }

    /**
     * Verifica el código de un correo. Marca {@code emailVerificado=true} si coincide.
     * Lanza {@link IllegalArgumentException} (400) si es inválido/expirado/usado.
     */
    @Transactional
    public void verificarCodigo(String correo, String codigo) {
        if (correo == null || codigo == null) {
            throw new IllegalArgumentException("Faltan datos para verificar el correo.");
        }
        String email = correo.trim().toLowerCase();
        CodigoEmail registro = codigoEmailRepository.findFirstByEmailOrderByFechaCreacionDesc(email)
                .orElseThrow(() -> new IllegalArgumentException("No hay un código pendiente para este correo."));

        if (registro.isExpirado()) {
            throw new IllegalArgumentException("El código expiró. Solicita uno nuevo.");
        }
        if (registro.isUtilizado()) {
            throw new IllegalArgumentException("Ese código ya se usó. Solicita uno nuevo.");
        }
        if (!passwordEncoder.matches(codigo, registro.getCodigo())) {
            throw new IllegalArgumentException("El código es incorrecto.");
        }

        registro.setUtilizado(true);
        codigoEmailRepository.save(registro);

        usuarioRepository.findByCorreo(email).ifPresent(u -> {
            if (!u.isEmailVerificado()) {
                u.setEmailVerificado(true);
                usuarioRepository.save(u);
            }
        });
        log.info("[EmailVerif] Correo verificado por código: {}", LogMask.email(email));
    }
}
