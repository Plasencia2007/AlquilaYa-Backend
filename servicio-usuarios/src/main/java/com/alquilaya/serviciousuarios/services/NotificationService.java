package com.alquilaya.serviciousuarios.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String WHATSAPP_MSG_URL = "http://localhost:8081/api/v1/notifications/whatsapp/send-message";

    public void enviarMensajeWhatsApp(String telefono, String mensaje) {
        Map<String, String> request = new HashMap<>();
        request.put("telefono", telefono);
        request.put("mensaje", mensaje);

        try {
            restTemplate.postForObject(WHATSAPP_MSG_URL, request, String.class);
            System.out.println("Mensaje WhatsApp enviado a " + telefono);
        } catch (Exception e) {
            System.err.println("Error enviando mensaje WhatsApp: " + e.getMessage());
        }
    }
}
