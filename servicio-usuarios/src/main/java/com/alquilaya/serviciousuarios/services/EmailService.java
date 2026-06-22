package com.alquilaya.serviciousuarios.services;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;

/**
 * Wrapper sobre JavaMailSender (Gmail SMTP) para envío transaccional.
 *
 * - Configurado vía Spring Boot autoconfigure desde {@code spring.mail.*} en
 *   config-server (ver servicio-usuarios.yml).
 * - Usado para el flow de forgot-password (link mágico de reset).
 * - Best-effort: si Gmail rechaza, se loguea y el endpoint forgot-password
 *   sigue devolviendo 200 (defensa contra enumeración de correos).
 *
 * Para Gmail SMTP en dev/MVP:
 *   - host: smtp.gmail.com
 *   - port: 587 (STARTTLS)
 *   - username: cuenta gmail real
 *   - password: app password de 16 chars (NO la contraseña normal de Google)
 *   - 2FA debe estar habilitado en la cuenta para generar app passwords
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    @Value("${app.base-url:http://localhost:3000}")
    private String appBaseUrl;

    /**
     * Envía email HTML de recuperación de contraseña con link al frontend.
     */
    @TimeLimiter(name = "enviarEmailCB")
    @CircuitBreaker(name = "enviarEmailCB", fallbackMethod = "fallbackEnviarResetPassword")
    @Retry(name = "enviarEmailCB")
    @Bulkhead(name = "enviarEmailCB", type = Bulkhead.Type.SEMAPHORE)
    @RateLimiter(name = "enviarEmailCB", fallbackMethod = "fallbackEnviarResetPassword")
    public CompletableFuture<Void> enviarResetPassword(String correo, String nombre, String token) {
        return CompletableFuture.runAsync(() -> {
            if (fromAddress == null || fromAddress.isBlank()) {
                log.warn("[Email] spring.mail.username no configurado — no se envía reset a {}", correo);
                return;
            }

            String link = appBaseUrl + "/reset-password?token=" + token;
            String html = templateResetPassword(nombre, link);

            try {
                MimeMessage mime = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mime, false, StandardCharsets.UTF_8.name());
                helper.setFrom(fromAddress, "AlquilaYa");
                helper.setTo(correo);
                helper.setSubject("Restablece tu contraseña en AlquilaYa");
                helper.setText(html, true);
                mailSender.send(mime);
                log.info("[Email] Reset enviado a {}", correo);
            } catch (MessagingException | java.io.UnsupportedEncodingException e) {
                log.error("Error preparando el correo: {}", e.getMessage());
                throw new RuntimeException("Error preparando el correo", e);
            }
        });
    }

    @SuppressWarnings("unused")
    private CompletableFuture<Void> fallbackEnviarResetPassword(String correo, String nombre, String token, Throwable t) {
        log.error("[FALLBACK] enviarResetPassword a {} — {}: {}. No se pudo enviar el correo de recuperación.",
                correo, t.getClass().getSimpleName(), t.getMessage());
        return CompletableFuture.completedFuture(null);
    }

    /** Envía email HTML con link de verificación de correo (#3). */
    @TimeLimiter(name = "enviarEmailCB")
    @CircuitBreaker(name = "enviarEmailCB", fallbackMethod = "fallbackEnviarVerificacionEmail")
    @Retry(name = "enviarEmailCB")
    @Bulkhead(name = "enviarEmailCB", type = Bulkhead.Type.SEMAPHORE)
    @RateLimiter(name = "enviarEmailCB", fallbackMethod = "fallbackEnviarVerificacionEmail")
    public CompletableFuture<Void> enviarVerificacionEmail(String correo, String nombre, String token) {
        return CompletableFuture.runAsync(() -> {
            if (fromAddress == null || fromAddress.isBlank()) {
                log.warn("[Email] spring.mail.username no configurado — no se envía verificación a {}", correo);
                return;
            }

            String link = appBaseUrl + "/verify-email?token=" + token;
            String html = templateVerificacionEmail(nombre, link);

            try {
                MimeMessage mime = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mime, false, StandardCharsets.UTF_8.name());
                helper.setFrom(fromAddress, "AlquilaYa");
                helper.setTo(correo);
                helper.setSubject("Verifica tu correo en AlquilaYa");
                helper.setText(html, true);
                mailSender.send(mime);
                log.info("[Email] Verificación enviada a {}", correo);
            } catch (MessagingException | java.io.UnsupportedEncodingException e) {
                log.error("Error preparando el correo: {}", e.getMessage());
                throw new RuntimeException("Error preparando el correo", e);
            }
        });
    }

    @SuppressWarnings("unused")
    private CompletableFuture<Void> fallbackEnviarVerificacionEmail(String correo, String nombre, String token, Throwable t) {
        log.error("[FALLBACK] enviarVerificacionEmail a {} — {}: {}. No se pudo enviar el correo de verificación.",
                correo, t.getClass().getSimpleName(), t.getMessage());
        return CompletableFuture.completedFuture(null);
    }

    /** Envía email HTML con un CÓDIGO de 6 dígitos para verificar el correo (#3). */
    @TimeLimiter(name = "enviarEmailCB")
    @CircuitBreaker(name = "enviarEmailCB", fallbackMethod = "fallbackEnviarCodigoVerificacion")
    @Retry(name = "enviarEmailCB")
    @Bulkhead(name = "enviarEmailCB", type = Bulkhead.Type.SEMAPHORE)
    @RateLimiter(name = "enviarEmailCB", fallbackMethod = "fallbackEnviarCodigoVerificacion")
    public CompletableFuture<Void> enviarCodigoVerificacion(String correo, String nombre, String codigo) {
        return CompletableFuture.runAsync(() -> {
            if (fromAddress == null || fromAddress.isBlank()) {
                log.warn("[Email] spring.mail.username no configurado — no se envía código a {}", correo);
                return;
            }
            String html = templateCodigoVerificacion(nombre, codigo);
            try {
                MimeMessage mime = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mime, false, StandardCharsets.UTF_8.name());
                helper.setFrom(fromAddress, "AlquilaYa");
                helper.setTo(correo);
                helper.setSubject("Tu código de verificación: " + codigo);
                helper.setText(html, true);
                mailSender.send(mime);
                log.info("[Email] Código de verificación enviado a {}", correo);
            } catch (MessagingException | java.io.UnsupportedEncodingException e) {
                log.error("Error preparando el correo: {}", e.getMessage());
                throw new RuntimeException("Error preparando el correo", e);
            }
        });
    }

    @SuppressWarnings("unused")
    private CompletableFuture<Void> fallbackEnviarCodigoVerificacion(String correo, String nombre, String codigo, Throwable t) {
        log.error("[FALLBACK] enviarCodigoVerificacion a {} — {}: {}. No se pudo enviar el código.",
                correo, t.getClass().getSimpleName(), t.getMessage());
        return CompletableFuture.completedFuture(null);
    }

    private String templateCodigoVerificacion(String nombre, String codigo) {
        String saludo = (nombre == null || nombre.isBlank()) ? "Hola" : "Hola " + nombre;
        return """
                <!DOCTYPE html>
                <html lang="es">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
                <body style="margin:0;padding:0;background:#f2ede9;font-family:Helvetica,Arial,sans-serif;color:#1d1b19;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f2ede9;padding:40px 20px;">
                    <tr><td align="center">
                      <table width="100%%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);" cellpadding="0" cellspacing="0">
                        <tr><td style="padding:32px 40px 8px 40px;">
                          <h1 style="margin:0;font-size:24px;font-weight:800;color:#8f0304;letter-spacing:-0.02em;">AlquilaYa</h1>
                        </td></tr>
                        <tr><td style="padding:8px 40px 0 40px;">
                          <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#1d1b19;">%s,</h2>
                          <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#6b5f57;">
                            Ingresa este código para verificar tu correo:
                          </p>
                          <p style="margin:16px 0;text-align:center;">
                            <span style="display:inline-block;background:#f2ede9;color:#8f0304;font-size:34px;font-weight:800;letter-spacing:10px;padding:16px 28px;border-radius:12px;">%s</span>
                          </p>
                          <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#6b5f57;">
                            El código expira en <strong>15 minutos</strong>. Si no creaste esta cuenta, ignora este correo.
                          </p>
                        </td></tr>
                        <tr><td style="padding:24px 40px 32px 40px;border-top:1px solid #e8e0d9;">
                          <p style="margin:0;font-size:11px;color:#bda5a8;text-align:center;">AlquilaYa — Cuartos para estudiantes UPeU<br>Lima, Perú</p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(saludo, codigo);
    }

    private String templateVerificacionEmail(String nombre, String link) {
        String saludo = (nombre == null || nombre.isBlank()) ? "Hola" : "Hola " + nombre;
        return """
                <!DOCTYPE html>
                <html lang="es">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Verifica tu correo</title>
                </head>
                <body style="margin:0;padding:0;background:#f2ede9;font-family:Helvetica,Arial,sans-serif;color:#1d1b19;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f2ede9;padding:40px 20px;">
                    <tr><td align="center">
                      <table width="100%%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);" cellpadding="0" cellspacing="0">
                        <tr><td style="padding:32px 40px 24px 40px;">
                          <h1 style="margin:0;font-size:24px;font-weight:800;color:#8f0304;letter-spacing:-0.02em;">AlquilaYa</h1>
                        </td></tr>
                        <tr><td style="padding:0 40px;">
                          <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#1d1b19;">%s,</h2>
                          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#6b5f57;">
                            Confirma que este correo es tuyo para terminar de activar tu cuenta. Haz click en el botón:
                          </p>
                          <p style="margin:24px 0;text-align:center;">
                            <a href="%s" style="display:inline-block;background:#8f0304;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:9999px;font-weight:700;font-size:14px;">
                              Verificar mi correo
                            </a>
                          </p>
                          <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#6b5f57;">
                            Si el botón no funciona, copia este enlace en tu navegador:<br>
                            <a href="%s" style="color:#8f0304;word-break:break-all;">%s</a>
                          </p>
                          <p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#6b5f57;">
                            El enlace expira en <strong>24 horas</strong>. Si no creaste esta cuenta, ignora este correo.
                          </p>
                        </td></tr>
                        <tr><td style="padding:32px 40px 32px 40px;border-top:1px solid #e8e0d9;margin-top:32px;">
                          <p style="margin:0;font-size:11px;color:#bda5a8;text-align:center;">
                            AlquilaYa — Cuartos para estudiantes UPeU<br>
                            Lima, Perú
                          </p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(saludo, link, link, link);
    }

    /**
     * Template HTML inline (sin engine de templates) — minimalista y compatible
     * con todos los clientes de email.
     */
    private String templateResetPassword(String nombre, String link) {
        String saludo = (nombre == null || nombre.isBlank()) ? "Hola" : "Hola " + nombre;
        return """
                <!DOCTYPE html>
                <html lang="es">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Restablece tu contraseña</title>
                </head>
                <body style="margin:0;padding:0;background:#f2ede9;font-family:Helvetica,Arial,sans-serif;color:#1d1b19;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f2ede9;padding:40px 20px;">
                    <tr><td align="center">
                      <table width="100%%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);" cellpadding="0" cellspacing="0">
                        <tr><td style="padding:32px 40px 24px 40px;">
                          <h1 style="margin:0;font-size:24px;font-weight:800;color:#8f0304;letter-spacing:-0.02em;">AlquilaYa</h1>
                        </td></tr>
                        <tr><td style="padding:0 40px;">
                          <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#1d1b19;">%s,</h2>
                          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#6b5f57;">
                            Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz click en el botón para crear una nueva.
                          </p>
                          <p style="margin:24px 0;text-align:center;">
                            <a href="%s" style="display:inline-block;background:#8f0304;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:9999px;font-weight:700;font-size:14px;">
                              Restablecer contraseña
                            </a>
                          </p>
                          <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#6b5f57;">
                            Si el botón no funciona, copia este enlace en tu navegador:<br>
                            <a href="%s" style="color:#8f0304;word-break:break-all;">%s</a>
                          </p>
                          <p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#6b5f57;">
                            El enlace expira en <strong>15 minutos</strong>. Si no solicitaste este cambio, ignora este correo.
                          </p>
                        </td></tr>
                        <tr><td style="padding:32px 40px 32px 40px;border-top:1px solid #e8e0d9;margin-top:32px;">
                          <p style="margin:0;font-size:11px;color:#bda5a8;text-align:center;">
                            AlquilaYa — Cuartos para estudiantes UPeU<br>
                            Lima, Perú
                          </p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(saludo, link, link, link);
    }
}
