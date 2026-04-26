package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.entities.OtpVerification;
import com.alquilaya.serviciousuarios.exceptions.EnvioOtpFallidoException;
import com.alquilaya.serviciousuarios.repositories.OtpVerificationRepository;
import com.alquilaya.serviciousuarios.util.LogMask;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {

    public static final int COOLDOWN_SEGUNDOS = 60;
    public static final int MAX_OTPS_VENTANA = 3;
    public static final int VENTANA_MINUTOS = 15;

    private static final SecureRandom RANDOM = new SecureRandom();

    private final OtpVerificationRepository otpRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${notification.service.url:http://localhost:8081}")
    private String notificationServiceUrl;

    @Value("${notification.service.api-key:}")
    private String notificationApiKey;

    public void generarYEnviarOtp(String telefono) {
        String codigo = String.format("%06d", RANDOM.nextInt(1_000_000));

        OtpVerification otp = OtpVerification.builder()
                .telefono(telefono)
                .codigo(codigo)
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
            restTemplate.exchange(
                    notificationServiceUrl + "/api/v1/notifications/whatsapp/send-otp",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    String.class);
            log.info("OTP enviado exitosamente en segundo plano");
        } catch (Exception e) {
            log.error("Fallo enviando OTP vía WhatsApp: {}", e.getMessage());
            // Como es asíncrono, no podemos romper la transacción principal de registro,
            // lo cual es deseable, ya que si falla el envío, el usuario igual se registra
            // y puede solicitar el reenvío del código más adelante.
        }
    }

    /**
     * Reenvía un nuevo OTP al teléfono dado, validando rate limit:
     *  - Cooldown 60s entre reenvíos.
     *  - Máximo {@value #MAX_OTPS_VENTANA} OTPs en {@value #VENTANA_MINUTOS} minutos.
     *
     * Lanza {@link IllegalArgumentException} (mapeada a 400) si se viola el límite.
     */
    public void reenviarOtp(String telefono) {
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
    }

    public boolean verificarOtp(String telefono, String codigo) {
        String masked = LogMask.phone(telefono);
        log.debug("Verificando OTP para teléfono {}", masked);
        return otpRepository.findFirstByTelefonoOrderByFechaCreacionDesc(telefono)
                .map(otp -> {
                    if (otp.isExpirado()) {
                        log.warn("OTP expirado para {}", masked);
                        return false;
                    }
                    if (otp.isUtilizado()) {
                        log.warn("OTP ya utilizado para {}", masked);
                        return false;
                    }
                    if (otp.getCodigo().equals(codigo)) {
                        otp.setUtilizado(true);
                        otpRepository.save(otp);
                        log.info("OTP verificado para {}", masked);
                        return true;
                    }
                    log.warn("OTP incorrecto para {}", masked);
                    return false;
                })
                .orElseGet(() -> {
                    log.warn("Sin registro de OTP para {}", masked);
                    return false;
                });
    }
}
