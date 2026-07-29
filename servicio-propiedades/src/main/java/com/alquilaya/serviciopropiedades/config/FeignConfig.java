package com.alquilaya.serviciopropiedades.config;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Configuration
public class FeignConfig {

    /** Ruta del endpoint interno de catalogos (zonas con comisión) que exige el secreto compartido. */
    private static final String CATALOGOS_ZONAS_INTERNO = "/zonas/activas/interno";

    /** Secreto compartido entre servicios internos (mismo valor en catalogos y en el servicio Node). */
    @Value("${internal.api-key:}")
    private String internalApiKey;

    @Bean
    public RequestInterceptor requestInterceptor() {
        return requestTemplate -> {
            try {
                org.springframework.web.context.request.ServletRequestAttributes attributes =
                    (org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();

                if (attributes != null) {
                    String authHeader = attributes.getRequest().getHeader("Authorization");
                    if (authHeader != null) {
                        requestTemplate.header("Authorization", authHeader);
                    }
                }
            } catch (Exception e) {
                // Si no hay contexto de request (ej. llamadas internas), intentar con el SecurityContext
                Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
                if (authentication != null && authentication.getCredentials() != null) {
                    String token = authentication.getCredentials().toString();
                    requestTemplate.header("Authorization", "Bearer " + token);
                }
            }

            // El endpoint interno de zonas de catalogos no usa JWT (propiedades lo llama también
            // desde hilos de background sin usuario): se autentica con el secreto compartido. Se
            // añade SOLO a esa ruta para no filtrar la clave a otros servicios (usuarios, mensajeria).
            String path = requestTemplate.path();
            if (path != null && path.contains(CATALOGOS_ZONAS_INTERNO)
                    && internalApiKey != null && !internalApiKey.isBlank()) {
                requestTemplate.header("X-Internal-Key", internalApiKey);
            }
        };
    }
}
