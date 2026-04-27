package com.alquilaya.serviciousuarios.services;

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
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

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
            enviarMensajeWhatsAppResiliente(body, headers).join();
            log.info("Mensaje WhatsApp enviado");
        } catch (Exception e) {
            log.error("Error enviando mensaje WhatsApp: {}", e.getMessage());
        }
    }

    @TimeLimiter(name = "enviarWhatsAppCB")
    @CircuitBreaker(name = "enviarWhatsAppCB", fallbackMethod = "fallbackEnviarMensajeWhatsApp")
    @Retry(name = "enviarWhatsAppCB")
    @Bulkhead(name = "enviarWhatsAppCB", type = Bulkhead.Type.SEMAPHORE)
    public CompletableFuture<Void> enviarMensajeWhatsAppResiliente(Map<String, String> body, HttpHeaders headers) {
        log.info("[Resilience4j] Enviando mensaje WhatsApp a notificaciones");
        return CompletableFuture.runAsync(() -> restTemplate.exchange(
                notificationServiceUrl + "/api/v1/notifications/whatsapp/send-message",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                String.class));
    }

    @SuppressWarnings("unused")
    private CompletableFuture<Void> fallbackEnviarMensajeWhatsApp(Map<String, String> body, HttpHeaders headers, Throwable t) {
        log.error("[FALLBACK] enviarMensajeWhatsApp — {}: {}. Notificación best-effort, no se rompe el flujo.",
                t.getClass().getSimpleName(), t.getMessage());
        return CompletableFuture.completedFuture(null);
    }
}
