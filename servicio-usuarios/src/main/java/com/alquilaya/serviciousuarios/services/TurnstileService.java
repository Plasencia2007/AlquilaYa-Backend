package com.alquilaya.serviciousuarios.services;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.List;

/**
 * Verificación anti-bots con Cloudflare Turnstile (#184) para register/forgot-password/
 * resend-otp: el rate-limit por IP ({@code RateLimitFilter}) ya existe pero no frena bots
 * que rotan IP o distribuyen requests en el tiempo.
 *
 * <p>Sin {@code TURNSTILE_SECRET_KEY} configurada, degrada a "permitir siempre" con un WARN
 * (mismo patrón que {@link ApiPeruService} con su token) — el entorno de desarrollo sigue
 * funcionando sin cuenta de Cloudflare, pero el gap queda visible en logs si se olvida
 * configurar en producción. Ídem si Cloudflare no responde (fail-open: un problema de red
 * ajeno no debe tumbar el registro completo).
 */
@Service
@Slf4j
public class TurnstileService {

    private static final String VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    @Value("${TURNSTILE_SECRET_KEY:}")
    private String secretKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean verificar(String token) {
        if (secretKey == null || secretKey.isBlank()) {
            log.warn("[TURNSTILE] TURNSTILE_SECRET_KEY no configurada — se omite la verificación anti-bots.");
            return true;
        }
        if (token == null || token.isBlank()) {
            log.info("[TURNSTILE] Petición sin token de Turnstile.");
            return false;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("secret", secretKey);
            body.add("response", token);
            HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(body, headers);

            TurnstileResponse res = restTemplate.postForObject(VERIFY_URL, entity, TurnstileResponse.class);
            if (res == null || !res.success) {
                log.warn("[TURNSTILE] Verificación fallida: {}",
                        res != null ? res.errorCodes : "sin respuesta de Cloudflare");
                return false;
            }
            return true;
        } catch (Exception e) {
            log.error("[TURNSTILE] Error consultando Cloudflare: {}", e.getMessage());
            return true;
        }
    }

    @Data
    private static class TurnstileResponse {
        private boolean success;
        @JsonProperty("error-codes")
        private List<String> errorCodes;
    }
}
