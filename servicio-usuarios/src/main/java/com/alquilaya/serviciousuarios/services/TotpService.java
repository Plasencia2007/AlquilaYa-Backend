package com.alquilaya.serviciousuarios.services;

import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

/**
 * TOTP / RFC 6238 para 2FA (ítem 229). Genera secrets y verifica códigos de 6 dígitos con
 * {@code dev.samstevens.totp} (no reinventamos el algoritmo HOTP/TOTP a mano).
 *
 * <p>Mientras el usuario no confirma el setup con un código válido, el secret vive SOLO en
 * Redis con TTL corto (mismo patrón de {@link OtpRateLimitService}/{@link JwtBlacklistService}:
 * {@code StringRedisTemplate} inyectado como {@code @Nullable}, prefijo {@code usuarios:},
 * graceful degradation si Redis no responde). Recién al confirmar se persiste en la entidad
 * {@code Usuario} (columna {@code totp_secret}, nunca expuesta en JSON).</p>
 */
@Slf4j
@Service
public class TotpService {

    private static final String TEMP_PREFIX = "usuarios:totp:pending:";
    private static final long TEMP_TTL_SECONDS = 600; // 10 min para completar el setup

    private final StringRedisTemplate redisTemplate;
    private final SecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final CodeVerifier codeVerifier = new DefaultCodeVerifier(new DefaultCodeGenerator(), new SystemTimeProvider());

    @Autowired
    public TotpService(@org.springframework.lang.Nullable StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /** Genera un secret nuevo y lo guarda temporalmente (Redis, TTL 10min) para ese usuario. */
    public String generarSecretTemporal(Long usuarioId) {
        String secret = secretGenerator.generate();
        if (redisTemplate == null) {
            throw new IllegalStateException("No se pudo iniciar la configuración de 2FA. Intenta más tarde.");
        }
        try {
            redisTemplate.opsForValue().set(TEMP_PREFIX + usuarioId, secret, TEMP_TTL_SECONDS, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("Redis no disponible al guardar secret temporal de 2FA: {}", e.getMessage());
            throw new IllegalStateException("No se pudo iniciar la configuración de 2FA. Intenta más tarde.");
        }
        return secret;
    }

    /** Secret pendiente de confirmar, o null si expiró / nunca se generó / Redis no responde. */
    public String obtenerSecretTemporal(Long usuarioId) {
        if (redisTemplate == null) return null;
        try {
            return redisTemplate.opsForValue().get(TEMP_PREFIX + usuarioId);
        } catch (Exception e) {
            log.warn("Redis no disponible al leer secret temporal de 2FA: {}", e.getMessage());
            return null;
        }
    }

    public void borrarSecretTemporal(Long usuarioId) {
        if (redisTemplate == null) return;
        try {
            redisTemplate.delete(TEMP_PREFIX + usuarioId);
        } catch (Exception e) {
            log.warn("Redis no disponible al limpiar secret temporal de 2FA: {}", e.getMessage());
        }
    }

    /** URI otpauth:// estándar (issuer=AlquilaYa) para que el frontend genere el QR client-side. */
    public String construirUri(String secret, String correo) {
        QrData data = new QrData.Builder()
                .label(correo)
                .secret(secret)
                .issuer("AlquilaYa")
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();
        return data.getUri();
    }

    /** Valida un código de 6 dígitos contra el secret dado. */
    public boolean verificar(String secret, String codigo) {
        if (secret == null || secret.isBlank() || codigo == null || codigo.isBlank()) return false;
        return codeVerifier.isValidCode(secret, codigo);
    }
}
