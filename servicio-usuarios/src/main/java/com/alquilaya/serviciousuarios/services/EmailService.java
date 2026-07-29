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

import java.math.BigDecimal;
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

    /**
     * Envía email HTML con un CÓDIGO de 6 dígitos para verificar el correo (#3), más un
     * enlace de verificación en un click (ítem 179: el correo trae el token JWT ya generado
     * por {@code EmailVerificationService}, acá sólo se arma el link al frontend).
     */
    @TimeLimiter(name = "enviarEmailCB")
    @CircuitBreaker(name = "enviarEmailCB", fallbackMethod = "fallbackEnviarCodigoVerificacion")
    @Retry(name = "enviarEmailCB")
    @Bulkhead(name = "enviarEmailCB", type = Bulkhead.Type.SEMAPHORE)
    @RateLimiter(name = "enviarEmailCB", fallbackMethod = "fallbackEnviarCodigoVerificacion")
    public CompletableFuture<Void> enviarCodigoVerificacion(String correo, String nombre, String codigo, String token) {
        return CompletableFuture.runAsync(() -> {
            if (fromAddress == null || fromAddress.isBlank()) {
                log.warn("[Email] spring.mail.username no configurado — no se envía código a {}", correo);
                return;
            }
            String link = appBaseUrl + "/verify-email?correo="
                    + java.net.URLEncoder.encode(correo, StandardCharsets.UTF_8)
                    + "&token=" + token;
            String html = templateCodigoVerificacion(nombre, codigo, link);
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
    private CompletableFuture<Void> fallbackEnviarCodigoVerificacion(String correo, String nombre, String codigo, String token, Throwable t) {
        log.error("[FALLBACK] enviarCodigoVerificacion a {} — {}: {}. No se pudo enviar el código.",
                correo, t.getClass().getSimpleName(), t.getMessage());
        return CompletableFuture.completedFuture(null);
    }

    /**
     * Envía el correo de CONFIRMACIÓN de una suscripción a alertas de nuevas propiedades
     * (double opt-in, #99/#492). Incluye el enlace de confirmación y, por seguridad, un enlace
     * de baja para quien recibió esto sin haberlo pedido.
     */
    @TimeLimiter(name = "enviarEmailCB")
    @CircuitBreaker(name = "enviarEmailCB", fallbackMethod = "fallbackEnviarConfirmacionSuscripcion")
    @Retry(name = "enviarEmailCB")
    @Bulkhead(name = "enviarEmailCB", type = Bulkhead.Type.SEMAPHORE)
    @RateLimiter(name = "enviarEmailCB", fallbackMethod = "fallbackEnviarConfirmacionSuscripcion")
    public CompletableFuture<Void> enviarConfirmacionSuscripcion(String correo, String tokenConfirmacion, String tokenBaja) {
        return CompletableFuture.runAsync(() -> {
            if (fromAddress == null || fromAddress.isBlank()) {
                log.warn("[Email] spring.mail.username no configurado — no se envía confirmación de alerta a {}", correo);
                return;
            }
            String confirmLink = appBaseUrl + "/alertas/confirmar?token=" + tokenConfirmacion;
            String bajaLink = appBaseUrl + "/alertas/baja?token=" + tokenBaja;
            String html = templateConfirmacionSuscripcion(confirmLink, bajaLink);
            try {
                MimeMessage mime = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mime, false, StandardCharsets.UTF_8.name());
                helper.setFrom(fromAddress, "AlquilaYa");
                helper.setTo(correo);
                helper.setSubject("Confirma tu alerta de nuevos cuartos en AlquilaYa");
                helper.setText(html, true);
                mailSender.send(mime);
                log.info("[Email] Confirmación de alerta enviada a {}", correo);
            } catch (MessagingException | java.io.UnsupportedEncodingException e) {
                log.error("Error preparando el correo: {}", e.getMessage());
                throw new RuntimeException("Error preparando el correo", e);
            }
        });
    }

    @SuppressWarnings("unused")
    private CompletableFuture<Void> fallbackEnviarConfirmacionSuscripcion(String correo, String tokenConfirmacion, String tokenBaja, Throwable t) {
        log.error("[FALLBACK] enviarConfirmacionSuscripcion a {} — {}: {}. No se pudo enviar la confirmación.",
                correo, t.getClass().getSimpleName(), t.getMessage());
        return CompletableFuture.completedFuture(null);
    }

    /**
     * Envía la ALERTA de una nueva propiedad aprobada a un suscriptor de forma SÍNCRONA y
     * BLOQUEANTE, usada por la cola de reintentos ({@code EnvioAlertaScheduler}). Incluye SIEMPRE
     * el enlace de baja con su token (#99/#492).
     *
     * <p>No es async ni tiene fallback de circuit-breaker que se trague el error: <b>lanza</b> si
     * el correo no se pudo enviar. Así el scheduler sabe el resultado REAL y sólo marca
     * {@code ENVIADO} cuando este método retorna sin excepción (envío efectivamente completado);
     * en fallo reintenta con backoff.</p>
     *
     * @throws RuntimeException si el mail no está configurado o el SMTP falla.
     */
    public void enviarAlertaNuevaPropiedadSync(String correo, String titulo, BigDecimal precio,
            String ubicacion, String tipoPropiedad, Long propiedadId, String tokenBaja) {
        if (fromAddress == null || fromAddress.isBlank()) {
            throw new IllegalStateException(
                    "spring.mail.username no configurado — no se puede enviar la alerta a " + correo);
        }
        construirYEnviarAlerta(correo, titulo, precio, ubicacion, tipoPropiedad, propiedadId, tokenBaja);
    }

    /**
     * Núcleo compartido: redacta y envía el correo de alerta de forma síncrona. Bloquea hasta
     * que {@code mailSender.send} retorna; propaga cualquier fallo como {@link RuntimeException}
     * (incluida {@link MailException} del SMTP), de modo que el caller pueda distinguir éxito de
     * fallo real. Asume {@code fromAddress} ya validado.
     */
    private void construirYEnviarAlerta(String correo, String titulo, BigDecimal precio,
            String ubicacion, String tipoPropiedad, Long propiedadId, String tokenBaja) {
        String propiedadLink = appBaseUrl + "/property/" + propiedadId;
        String bajaLink = appBaseUrl + "/alertas/baja?token=" + tokenBaja;
        String html = templateAlertaNuevaPropiedad(titulo, precio, ubicacion, tipoPropiedad, propiedadLink, bajaLink);
        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, false, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress, "AlquilaYa");
            helper.setTo(correo);
            helper.setSubject("Nuevo cuarto en AlquilaYa: " + (titulo == null ? "una propiedad para ti" : titulo));
            helper.setText(html, true);
            mailSender.send(mime);
            log.info("[Email] Alerta de nueva propiedad {} enviada a {}", propiedadId, correo);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Error preparando el correo: {}", e.getMessage());
            throw new RuntimeException("Error preparando el correo", e);
        }
    }

    private String templateCodigoVerificacion(String nombre, String codigo, String link) {
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
                          <p style="margin:20px 0 8px 0;text-align:center;">
                            <a href="%s" style="display:inline-block;background:#8f0304;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:9999px;font-weight:700;font-size:13px;">
                              O verifica con un click
                            </a>
                          </p>
                          <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#6b5f57;">
                            El código expira en <strong>15 minutos</strong>; el enlace, en <strong>24 horas</strong>. Si no creaste esta cuenta, ignora este correo.
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
                """.formatted(saludo, codigo, link);
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

    private String templateConfirmacionSuscripcion(String confirmLink, String bajaLink) {
        return """
                <!DOCTYPE html>
                <html lang="es">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
                <body style="margin:0;padding:0;background:#f2ede9;font-family:Helvetica,Arial,sans-serif;color:#1d1b19;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f2ede9;padding:40px 20px;">
                    <tr><td align="center">
                      <table width="100%%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);" cellpadding="0" cellspacing="0">
                        <tr><td style="padding:32px 40px 24px 40px;">
                          <h1 style="margin:0;font-size:24px;font-weight:800;color:#8f0304;letter-spacing:-0.02em;">AlquilaYa</h1>
                        </td></tr>
                        <tr><td style="padding:0 40px;">
                          <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#1d1b19;">Confirma tu alerta</h2>
                          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#6b5f57;">
                            Recibiste este correo porque alguien pidió avisos de nuevos cuartos en AlquilaYa con esta dirección.
                            Confirma para empezar a recibir las alertas:
                          </p>
                          <p style="margin:24px 0;text-align:center;">
                            <a href="%s" style="display:inline-block;background:#8f0304;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:9999px;font-weight:700;font-size:14px;">
                              Confirmar mi alerta
                            </a>
                          </p>
                          <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#6b5f57;">
                            Si el botón no funciona, copia este enlace en tu navegador:<br>
                            <a href="%s" style="color:#8f0304;word-break:break-all;">%s</a>
                          </p>
                          <p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#6b5f57;">
                            ¿No fuiste tú? Ignora este correo o
                            <a href="%s" style="color:#8f0304;">cancela la suscripción</a>. No recibirás más avisos sin confirmar.
                          </p>
                        </td></tr>
                        <tr><td style="padding:32px 40px 32px 40px;border-top:1px solid #e8e0d9;">
                          <p style="margin:0;font-size:11px;color:#bda5a8;text-align:center;">
                            AlquilaYa — Cuartos para estudiantes UPeU<br>Lima, Perú
                          </p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(confirmLink, confirmLink, confirmLink, bajaLink);
    }

    private String templateAlertaNuevaPropiedad(String titulo, BigDecimal precio, String ubicacion,
            String tipoPropiedad, String propiedadLink, String bajaLink) {
        String tituloSafe = (titulo == null || titulo.isBlank()) ? "Nuevo cuarto disponible" : titulo;
        String precioSafe = (precio == null) ? "Consultar" : "S/ " + precio.stripTrailingZeros().toPlainString();
        String ubicacionSafe = (ubicacion == null || ubicacion.isBlank()) ? "" : ubicacion;
        String tipoSafe = (tipoPropiedad == null || tipoPropiedad.isBlank()) ? "" : tipoPropiedad;
        String metaLinea = java.util.stream.Stream.of(tipoSafe, ubicacionSafe)
                .filter(s -> !s.isBlank())
                .reduce((a, b) -> a + " · " + b)
                .orElse("");
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
                          <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#8f0304;">Nuevo cuarto para ti</p>
                          <h2 style="margin:0 0 6px 0;font-size:22px;font-weight:800;color:#1d1b19;">%s</h2>
                          <p style="margin:0 0 4px 0;font-size:14px;color:#6b5f57;">%s</p>
                          <p style="margin:8px 0 0 0;font-size:20px;font-weight:800;color:#1d1b19;">%s</p>
                          <p style="margin:24px 0;text-align:center;">
                            <a href="%s" style="display:inline-block;background:#8f0304;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:9999px;font-weight:700;font-size:14px;">
                              Ver el cuarto
                            </a>
                          </p>
                        </td></tr>
                        <tr><td style="padding:24px 40px 32px 40px;border-top:1px solid #e8e0d9;">
                          <p style="margin:0 0 8px 0;font-size:11px;color:#bda5a8;text-align:center;">
                            Recibes este correo por tu alerta de nuevos cuartos.
                            <a href="%s" style="color:#8f0304;">Darme de baja</a>
                          </p>
                          <p style="margin:0;font-size:11px;color:#bda5a8;text-align:center;">AlquilaYa — Cuartos para estudiantes UPeU<br>Lima, Perú</p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(tituloSafe, metaLinea, precioSafe, propiedadLink, bajaLink);
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
