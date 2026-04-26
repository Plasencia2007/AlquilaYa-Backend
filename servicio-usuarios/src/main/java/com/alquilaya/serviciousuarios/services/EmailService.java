package com.alquilaya.serviciousuarios.services;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

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
    public void enviarResetPassword(String correo, String nombre, String token) {
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
        } catch (MessagingException | MailException | java.io.UnsupportedEncodingException e) {
            log.warn("[Email] Fallo enviando reset a {}: {}", correo, e.getMessage());
            // No relanzamos: forgot-password debe responder 200 siempre.
        }
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
