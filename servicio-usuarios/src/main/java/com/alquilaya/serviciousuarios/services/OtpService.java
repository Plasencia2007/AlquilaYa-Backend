package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.ReenviarOtpResponse;
import com.alquilaya.serviciousuarios.entities.OtpVerification;
import com.alquilaya.serviciousuarios.exceptions.EnvioOtpFallidoException;
import com.alquilaya.serviciousuarios.repositories.OtpVerificationRepository;
import com.alquilaya.serviciousuarios.util.LogMask;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {

    public static final int COOLDOWN_SEGUNDOS = 60;
    public static final int MAX_OTPS_VENTANA = 3;
    public static final int VENTANA_MINUTOS = 15;

    private static final SecureRandom RANDOM = new SecureRandom();

    private final OtpVerificationRepository otpRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpRateLimitService otpRateLimitService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${notification.service.url:http://localhost:8081}")
    private String notificationServiceUrl;

    @Value("${notification.service.api-key:}")
    private String notificationApiKey;

    public void generarYEnviarOtp(String telefono) {
        // Antes de generar un nuevo OTP verificamos el lockout por brute force.
        otpRateLimitService.verificarLockout(telefono);

        String codigo = String.format("%06d", RANDOM.nextInt(1_000_000));

        OtpVerification otp = OtpVerification.builder()
                .telefono(telefono)
                // Persistimos el HASH, no el código en claro. El código viaja
                // solo al usuario por WhatsApp.
                .codigo(passwordEncoder.encode(codigo))
                .fechaExpiracion(LocalDateTime.now().plusMinutes(5))
                .build();
        otpRepository.save(otp);

        Map<String, String> body = new HashMap<>();
        body.put("telefono", telefono);
        body.put("codigo", codigo);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/json");
        if (notificationApiKey != null && !notificationApiKey.isBlank()) {
            headers.set("x-api-key", notificationApiKey);
        }

        // Delegar envío HTTP a un hilo separado
        enviarHttpAsync(body, headers);
    }

    @org.springframework.scheduling.annotation.Async
    public void enviarHttpAsync(Map<String, String> body, HttpHeaders headers) {
        try {
            log.debug("Intentando enviar OTP de forma asíncrona");
            enviarOtpResiliente(body, headers).join();
            log.info("OTP enviado exitosamente en segundo plano");
        } catch (Exception e) {
            log.error("Fallo enviando OTP vía WhatsApp: {}", e.getMessage());
        }
    }

    @TimeLimiter(name = "enviarOtpCB")
    @CircuitBreaker(name = "enviarOtpCB", fallbackMethod = "fallbackEnviarOtp")
    @Retry(name = "enviarOtpCB")
    @Bulkhead(name = "enviarOtpCB", type = Bulkhead.Type.SEMAPHORE)
    public CompletableFuture<Void> enviarOtpResiliente(Map<String, String> body, HttpHeaders headers) {
        log.info("[Resilience4j] Enviando OTP a servicio de notificaciones");
        return CompletableFuture.runAsync(() -> restTemplate.exchange(
                notificationServiceUrl + "/api/v1/notifications/whatsapp/send-otp",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                String.class));
    }

    @SuppressWarnings("unused")
    private CompletableFuture<Void> fallbackEnviarOtp(Map<String, String> body, HttpHeaders headers, Throwable t) {
        log.error("[FALLBACK] enviarOtp — {}: {}. El usuario podrá solicitar reenvío manualmente.",
                t.getClass().getSimpleName(), t.getMessage());
        return CompletableFuture.completedFuture(null);
    }

    /**
     * Reenvía un nuevo OTP al teléfono dado, validando rate limit:
     *  - Cooldown 60s entre reenvíos.
     *  - Máximo {@value #MAX_OTPS_VENTANA} OTPs en {@value #VENTANA_MINUTOS} minutos.
     *
     * Lanza {@link IllegalArgumentException} (mapeada a 400) si se viola el límite. Devuelve
     * cuántos reenvíos quedan en la ventana actual (hallazgo de backend, ítem 191) — el
     * teléfono ya se sabe existente en este punto del flujo (viene de un registro en curso,
     * no es una superficie anti-enumeración como forgot-password), así que no hay problema en
     * exponer el contador real.
     */
    public ReenviarOtpResponse reenviarOtp(String telefono) {
        // También chequea lockout por brute force previo.
        otpRateLimitService.verificarLockout(telefono);

        LocalDateTime ahora = LocalDateTime.now();

        // Cooldown: ¿hubo OTP en los últimos COOLDOWN_SEGUNDOS?
        otpRepository.findFirstByTelefonoOrderByFechaCreacionDesc(telefono).ifPresent(ultimo -> {
            long segundos = java.time.Duration.between(ultimo.getFechaCreacion(), ahora).getSeconds();
            if (segundos < COOLDOWN_SEGUNDOS) {
                long restan = COOLDOWN_SEGUNDOS - segundos;
                throw new IllegalArgumentException(
                        "Espera " + restan + " segundos antes de reenviar el código.");
            }
        });

        // Quota: máximo MAX_OTPS_VENTANA en VENTANA_MINUTOS
        long enVentana = otpRepository.countByTelefonoAndFechaCreacionAfter(
                telefono, ahora.minusMinutes(VENTANA_MINUTOS));
        if (enVentana >= MAX_OTPS_VENTANA) {
            throw new IllegalArgumentException(
                    "Alcanzaste el máximo de reenvíos. Intenta en " + VENTANA_MINUTOS + " minutos.");
        }

        generarYEnviarOtp(telefono);

        int restantes = (int) Math.max(0, MAX_OTPS_VENTANA - (enVentana + 1));
        return new ReenviarOtpResponse("Te enviamos un nuevo código por WhatsApp.", restantes);
    }

    public boolean verificarOtp(String telefono, String codigo) {
        String masked = LogMask.phone(telefono);
        log.debug("Verificando OTP para teléfono {}", masked);

        // Rate limit Redis: bloquea brute force antes de tocar la BD.
        otpRateLimitService.verificarLockout(telefono);

        return otpRepository.findFirstByTelefonoOrderByFechaCreacionDesc(telefono)
                .map(otp -> {
                    if (otp.isExpirado()) {
                        log.warn("OTP expirado para {}", masked);
                        // OTP expirado no es un intento de brute force, no incrementamos.
                        return false;
                    }
                    if (otp.isUtilizado()) {
                        log.warn("OTP ya utilizado para {}", masked);
                        return false;
                    }
                    // Comparación BCrypt contra el hash persistido.
                    if (passwordEncoder.matches(codigo, otp.getCodigo())) {
                        otp.setUtilizado(true);
                        otpRepository.save(otp);
                        log.info("OTP verificado para {}", masked);
                        // Limpia contadores tras éxito.
                        otpRateLimitService.limpiar(telefono);
                        return true;
                    }
                    log.warn("OTP incorrecto para {}", masked);
                    // Sí cuenta como intento fallido — puede activar lockout (lanza 429).
                    otpRateLimitService.registrarFallo(telefono);
                    return false;
                })
                .orElseGet(() -> {
                    log.warn("Sin registro de OTP para {}", masked);
                    // Sin OTP previo: igual contamos como fallo para evitar
                    // sondeo de números de teléfono.
                    otpRateLimitService.registrarFallo(telefono);
                    return false;
                });
    }
}
