package com.alquilaya.serviciousuarios.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Respuesta de POST /auth/2fa/generar (ítem 229): secret en claro (solo para setup manual,
 * el usuario lo ve una vez) + URI otpauth:// que el frontend convierte en QR client-side
 * (qrcode.react). El secret vive temporalmente en Redis (TTL corto) hasta /confirmar.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Generar2faResponse {
    private String secret;
    private String otpauthUri;
}
