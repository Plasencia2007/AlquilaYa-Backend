package com.alquilaya.serviciousuarios.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

    public void enviarMensajeWhatsApp(String telefono, String mensaje) {
        Map<String, String> request = new HashMap<>();
        request.put("telefono", telefono);
        request.put("mensaje", mensaje);

        try {
            restTemplate.postForObject(notificationServiceUrl + "/api/v1/notifications/whatsapp/send-message", request, String.class);
            log.info("Mensaje WhatsApp enviado a {}", telefono);
        } catch (Exception e) {
            log.error("Error enviando mensaje WhatsApp a {}: {}", telefono, e.getMessage());
        }
    }
}
