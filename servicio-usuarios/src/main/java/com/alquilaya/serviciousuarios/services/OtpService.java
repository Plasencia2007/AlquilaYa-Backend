package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.entities.OtpVerification;
import com.alquilaya.serviciousuarios.exceptions.OtpInvalidoException;
import com.alquilaya.serviciousuarios.repositories.OtpVerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {

    private final OtpVerificationRepository otpRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${notification.service.url:http://localhost:8081}")
    private String notificationServiceUrl;

    public void generarYEnviarOtp(String telefono) {
        String codigo = String.format("%06d", new Random().nextInt(999999));

        OtpVerification otp = OtpVerification.builder()
                .telefono(telefono)
                .codigo(codigo)
                .fechaExpiracion(LocalDateTime.now().plusMinutes(5))
                .build();
        otpRepository.save(otp);

        Map<String, String> request = new HashMap<>();
        request.put("telefono", telefono);
        request.put("codigo", codigo);

        try {
            log.debug("Intentando enviar OTP a {}", telefono);
            restTemplate.postForObject(notificationServiceUrl + "/api/v1/notifications/whatsapp/send-otp", request, String.class);
            log.info("OTP generado y enviado exitosamente a {}", telefono);
        } catch (Exception e) {
            log.error("Fallo crítico al enviar OTP via WhatsApp a {}: {}", telefono, e.getMessage());
            // No lanzamos excepción para no romper el flujo de registro, pero queda en logs
        }
    }

    public boolean verificarOtp(String telefono, String codigo) {
        log.debug("Verificando OTP para teléfono: {}", telefono);
        return otpRepository.findFirstByTelefonoOrderByFechaCreacionDesc(telefono)
                .map(otp -> {
                    if (otp.isExpirado()) {
                        log.warn("El OTP para {} ha expirado", telefono);
                        return false;
                    }
                    if (otp.isUtilizado()) {
                        log.warn("El OTP para {} ya ha sido utilizado", telefono);
                        return false;
                    }
                    if (otp.getCodigo().equals(codigo)) {
                        otp.setUtilizado(true);
                        otpRepository.save(otp);
                        log.info("OTP verificado correctamente para {}", telefono);
                        return true;
                    }
                    log.warn("Código OTP incorrecto para {}", telefono);
                    return false;
                })
                .orElseGet(() -> {
                    log.warn("No se encontró ningún registro de OTP para {}", telefono);
                    return false;
                });
    }
}
