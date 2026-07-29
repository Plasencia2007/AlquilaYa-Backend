package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.config.JwtService;
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
import java.util.Date;
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
    private final EmailRateLimitService emailRateLimitService;
    // Ítem 179: verificación en un click. JwtService ya traía generateEmailVerificationToken/
    // validateEmailVerificationToken (claim type=email_verification, 24h) sin que nada los
    // llamara — se reusan acá en vez de inventar un esquema nuevo.
    private final JwtService jwtService;
    private final JwtBlacklistService jwtBlacklistService;

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

    /**
     * Genera un código, lo guarda hasheado, y lo envía por email junto con un enlace de
     * verificación en un click (ítem 179 — token JWT de un solo uso, 24h). Reutilizable
     * desde el registro.
     */
    @Transactional
    public void enviar(Usuario u) {
        String codigo = String.format("%06d", RANDOM.nextInt(1_000_000));
        codigoEmailRepository.save(CodigoEmail.builder()
                .email(u.getCorreo())
                .codigo(passwordEncoder.encode(codigo))
                .fechaExpiracion(LocalDateTime.now().plusMinutes(VIGENCIA_MINUTOS))
                .build());
        String token = jwtService.generateEmailVerificationToken(u.getCorreo());
        emailService.enviarCodigoVerificacion(u.getCorreo(), u.getNombre(), codigo, token);
        log.info("[EmailVerif] Código + enlace enviados a {}", LogMask.email(u.getCorreo()));
    }

    /**
     * Verifica el código de un correo. Marca {@code emailVerificado=true} si coincide.
     * Lanza {@link IllegalArgumentException} (400) si es inválido/expirado/usado, o
     * {@link OtpRateLimitService.OtpLockoutException} (429) si el correo está bloqueado
     * por demasiados intentos fallidos — mismo mecanismo de lockout que
     * {@link OtpService#verificarOtp}, con clave por correo vía {@link EmailRateLimitService}.
     */
    @Transactional
    public void verificarCodigo(String correo, String codigo) {
        if (correo == null || codigo == null) {
            throw new IllegalArgumentException("Faltan datos para verificar el correo.");
        }
        String email = correo.trim().toLowerCase();

        // Rate limit Redis: bloquea brute force del código de 6 dígitos antes de tocar la BD.
        emailRateLimitService.verificarLockout(email);

        Optional<CodigoEmail> registroOpt = codigoEmailRepository.findFirstByEmailOrderByFechaCreacionDesc(email);
        if (registroOpt.isEmpty()) {
            // Sin código previo: igual cuenta como fallo para evitar sondeo de correos.
            emailRateLimitService.registrarFallo(email);
            throw new IllegalArgumentException("No hay un código pendiente para este correo.");
        }
        CodigoEmail registro = registroOpt.get();

        if (registro.isExpirado()) {
            // Expirado no es un intento de brute force, no se incrementa el contador.
            throw new IllegalArgumentException("El código expiró. Solicita uno nuevo.");
        }
        if (registro.isUtilizado()) {
            throw new IllegalArgumentException("Ese código ya se usó. Solicita uno nuevo.");
        }
        if (!passwordEncoder.matches(codigo, registro.getCodigo())) {
            // Cuenta como intento fallido — puede activar lockout (lanza 429).
            emailRateLimitService.registrarFallo(email);
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
        // Limpia contadores tras éxito.
        emailRateLimitService.limpiar(email);
        log.info("[EmailVerif] Correo verificado por código: {}", LogMask.email(email));
    }

    /**
     * Verifica el correo a partir del enlace de un solo click (ítem 179). Mismo patrón de
     * un solo uso que {@link PasswordResetService#resetear}: JWT corto (claim
     * {@code type=email_verification}, 24h) + blacklist en Redis para invalidarlo tras el
     * primer uso — no se inventa un esquema de UUID+tabla nuevo porque este ya es el
     * establecido en el proyecto para tokens de un solo uso enviados por email.
     *
     * @return el usuario cuyo correo quedó verificado, para que el controller decida si ya
     *         puede emitir sesión (U1: puede seguir faltando otro factor si el método es AMBOS).
     */
    @Transactional
    public Usuario verificarToken(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Falta el token de verificación.");
        }

        String correo;
        try {
            correo = jwtService.validateEmailVerificationToken(token);
        } catch (Exception e) {
            throw new IllegalArgumentException("El enlace de verificación es inválido o expiró.");
        }

        if (jwtBlacklistService.isBlacklisted(token)) {
            throw new IllegalArgumentException("Este enlace ya fue utilizado. Solicita uno nuevo.");
        }

        Usuario u = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new IllegalArgumentException("Cuenta no encontrada"));

        if (!u.isEmailVerificado()) {
            u.setEmailVerificado(true);
            usuarioRepository.save(u);
        }

        // Un solo uso: invalidar el token tras usarlo (mismo mecanismo que el reset de password).
        Date exp;
        try {
            exp = jwtService.getExpiration(token);
        } catch (Exception e) {
            exp = new Date(System.currentTimeMillis() + 24 * 60 * 60_000L); // fallback: vida del token (24h)
        }
        jwtBlacklistService.blacklist(token, exp);

        log.info("[EmailVerif] Correo verificado por enlace: {}", LogMask.email(correo));
        return u;
    }
}
