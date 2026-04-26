package com.alquilaya.serviciousuarios.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${notification.service.url:http://localhost:8081}")
    private String notificationServiceUrl;

    @Value("${notification.service.api-key:}")
    private String notificationApiKey;

    public void enviarMensajeWhatsApp(String telefono, String mensaje) {
        Map<String, String> body = new HashMap<>();
        body.put("telefono", telefono);
        body.put("mensaje", mensaje);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/json");
        if (notificationApiKey != null && !notificationApiKey.isBlank()) {
            headers.set("x-api-key", notificationApiKey);
        }

        try {
            restTemplate.exchange(
                    notificationServiceUrl + "/api/v1/notifications/whatsapp/send-message",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    String.class);
            log.info("Mensaje WhatsApp enviado");
        } catch (Exception e) {
            // Aquí no rompemos la transacción: es una notificación "best-effort"
            // (p.ej. resultado de verificación de documentos), no bloquea el flujo.
            log.error("Error enviando mensaje WhatsApp: {}", e.getMessage());
        }
    }
}
