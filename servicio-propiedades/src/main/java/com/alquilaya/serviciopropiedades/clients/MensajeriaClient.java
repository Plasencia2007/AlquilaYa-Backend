package com.alquilaya.serviciopropiedades.clients;

import com.alquilaya.serviciopropiedades.config.FeignConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.Map;

@FeignClient(name = "servicio-mensajeria", contextId = "mensajeriaClient", configuration = FeignConfig.class, fallback = MensajeriaClientFallback.class)
public interface MensajeriaClient {

    @GetMapping("/api/v1/notificaciones/no-leidas/count")
    Map<String, Long> contarNoLeidas();
}
