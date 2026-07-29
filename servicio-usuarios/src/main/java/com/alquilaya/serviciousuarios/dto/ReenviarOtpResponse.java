package com.alquilaya.serviciousuarios.dto;

/**
 * Respuesta de {@code POST /resend-otp} (hallazgo de backend, ítem 191: el frontend no podía
 * mostrar "intentos restantes" porque este endpoint solo devolvía un mensaje). Solo aplica al
 * OTP por teléfono — el reenvío de verificación por email NO expone este dato a propósito
 * (ver {@code AuthController#resendEmailVerification}: es idempotente/anti-enumeración, ítem
 * 194, y un contador real filtraría si la cuenta existe).
 */
public record ReenviarOtpResponse(String mensaje, int intentosRestantes) {}
