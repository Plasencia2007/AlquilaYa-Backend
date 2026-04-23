package com.alquilaya.serviciopropiedades.config;

import feign.RequestInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Configuration
public class FeignConfig {

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
        };
    }
}
