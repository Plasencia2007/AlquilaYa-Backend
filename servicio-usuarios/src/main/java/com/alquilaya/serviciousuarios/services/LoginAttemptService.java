package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.entities.LoginAttempt;
import com.alquilaya.serviciousuarios.entities.Usuario;
import com.alquilaya.serviciousuarios.exceptions.CuentaBloqueadaException;
import com.alquilaya.serviciousuarios.kafka.UserEventProducer;
import com.alquilaya.serviciousuarios.repositories.LoginAttemptRepository;
import com.alquilaya.serviciousuarios.repositories.UsuarioRepository;
import com.alquilaya.serviciousuarios.util.LogMask;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Bloqueo de cuenta tras 5 logins fallidos consecutivos en 15 minutos.
 *
 * - Antes de validar password: {@link #verificarBloqueo(String)} lanza
 *   {@link CuentaBloqueadaException} (HTTP 423) si la cuenta está bloqueada.
 * - Después: {@link #registrarFallo(String, String)} o
 *   {@link #registrarExito(String)} según el resultado del login.
 *
 * Este bloqueo es por correo (no por IP — eso ya lo hace
 * {@link com.alquilaya.serviciousuarios.config.RateLimitFilter}). Útil contra
 * password spraying distribuido.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoginAttemptService {

    public static final int MAX_FALLOS = 5;
    public static final int VENTANA_MIN = 15;

    private final LoginAttemptRepository repo;
    private final UsuarioRepository usuarioRepository;
    private final UserEventProducer eventProducer;

    /**
     * Lanza si el correo tiene 5+ fallos en los últimos 15 minutos.
     * Llamar ANTES de validar password.
     */
    @Transactional(readOnly = true)
    public void verificarBloqueo(String correo) {
        if (correo == null || correo.isBlank()) return;
        long fallos = repo.countByCorreoAndExitoFalseAndTsAfter(
                correo.toLowerCase(),
                LocalDateTime.now().minusMinutes(VENTANA_MIN));
        if (fallos >= MAX_FALLOS) {
            throw new CuentaBloqueadaException(
                    "Demasiados intentos fallidos. Por seguridad bloqueamos el acceso por "
                            + VENTANA_MIN + " minutos. Intenta de nuevo más tarde o restablece tu contraseña.");
        }
    }

    /**
     * Registra un fallo de login. Si llega al 5º fallo, emite alerta vía Kafka
     * (consumida por servicio-mensajeria → notif WhatsApp/in-app).
     */
    @Transactional
    public void registrarFallo(String correo, String ip) {
        String correoNorm = correo == null ? "" : correo.trim().toLowerCase();
        repo.save(LoginAttempt.builder()
                .correo(correoNorm)
                .ip(ip)
                .ts(LocalDateTime.now())
                .exito(false)
                .build());

        long fallos = repo.countByCorreoAndExitoFalseAndTsAfter(
                correoNorm, LocalDateTime.now().minusMinutes(VENTANA_MIN));
        if (fallos == MAX_FALLOS) {
            log.warn("[Login] Cuenta bloqueada por {} fallos: {}", fallos, LogMask.email(correoNorm));
            Optional<Usuario> opt = usuarioRepository.findByCorreo(correoNorm);
            opt.ifPresent(u -> eventProducer.emitirAlertaIntentosFallidos(
                    u.getId(), u.getCorreo(), u.getTelefono(), ip));
        }
    }

    /**
     * Registra un login exitoso. No bloquea pero queda en histórico para
     * auditoría futura.
     */
    @Transactional
    public void registrarExito(String correo, String ip) {
        if (correo == null || correo.isBlank()) return;
        repo.save(LoginAttempt.builder()
                .correo(correo.trim().toLowerCase())
                .ip(ip)
                .ts(LocalDateTime.now())
                .exito(true)
                .build());
    }
}
