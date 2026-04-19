package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.entities.OtpVerification;
import com.alquilaya.serviciousuarios.repositories.OtpVerificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final OtpVerificationRepository otpRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final String WHATSAPP_SERVICE_URL = "http://localhost:8081/api/v1/notifications/whatsapp/send-otp";

    public void generarYEnviarOtp(String telefono) {
        // 1. Generar código de 6 dígitos
        String codigo = String.format("%06d", new Random().nextInt(999999));

        // 2. Guardar en DB
        OtpVerification otp = OtpVerification.builder()
                .telefono(telefono)
                .codigo(codigo)
                .fechaExpiracion(LocalDateTime.now().plusMinutes(5))
                .build();
        otpRepository.save(otp);

        // 3. Llamar al microservicio de WhatsApp
        Map<String, String> request = new HashMap<>();
        request.put("telefono", telefono);
        request.put("codigo", codigo);

        try {
            restTemplate.postForObject(WHATSAPP_SERVICE_URL, request, String.class);
            System.out.println("OTP enviado a " + telefono + ": " + codigo);
        } catch (Exception e) {
            System.err.println("Error enviando OTP via WhatsApp: " + e.getMessage());
            // En producción, aquí podrías manejar reintentos o fallbacks a SMS
        }
    }

    public boolean verificarOtp(String telefono, String codigo) {
        return otpRepository.findFirstByTelefonoOrderByFechaCreacionDesc(telefono)
                .map(otp -> {
                    if (otp.isExpirado() || otp.isUtilizado()) {
                        return false;
                    }
                    if (otp.getCodigo().equals(codigo)) {
                        otp.setUtilizado(true);
                        otpRepository.save(otp);
                        return true;
                    }
                    return false;
                })
                .orElse(false);
    }
}
