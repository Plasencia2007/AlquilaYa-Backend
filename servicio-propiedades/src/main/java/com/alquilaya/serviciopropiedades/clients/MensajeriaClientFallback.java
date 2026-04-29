package com.alquilaya.serviciopropiedades.clients;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
public class MensajeriaClientFallback implements MensajeriaClient {

    @Override
    public Map<String, Long> contarNoLeidas() {
        log.warn("[FEIGN FALLBACK] servicio-mensajeria no disponible. Devolviendo 0 mensajes sin leer.");
        return Map.of("count", 0L);
    }
}
