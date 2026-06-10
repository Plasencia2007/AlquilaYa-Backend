package com.alquilaya.servicio_mensajeria.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configura la documentacion OpenAPI (Swagger UI) del servicio.
 * UI disponible en /swagger-ui.html ; spec JSON en /v3/api-docs.
 * Cubre los endpoints REST del chat; el canal WebSocket STOMP no se documenta aqui.
 * Registra un esquema de seguridad Bearer (JWT) para probar endpoints autenticados.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER = "bearerAuth";

    @Bean
    public OpenAPI alquilayaOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AlquilaYa - Servicio Mensajeria API")
                        .version("v1")
                        .description("Chat REST. El tiempo real (STOMP/WebSocket) corre fuera de OpenAPI."))
                .addSecurityItem(new SecurityRequirement().addList(BEARER))
                .components(new Components().addSecuritySchemes(BEARER,
                        new SecurityScheme()
                                .name(BEARER)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
