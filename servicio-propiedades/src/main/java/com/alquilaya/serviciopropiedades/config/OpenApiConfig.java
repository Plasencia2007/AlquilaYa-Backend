package com.alquilaya.serviciopropiedades.config;

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
 * Registra un esquema de seguridad Bearer (JWT) para poder probar
 * endpoints autenticados desde la propia UI (boton "Authorize").
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER = "bearerAuth";

    @Bean
    public OpenAPI alquilayaOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AlquilaYa - Servicio Propiedades API")
                        .version("v1")
                        .description("Propiedades, reservas, favoritos, resenas e imagenes (Cloudinary)."))
                .addSecurityItem(new SecurityRequirement().addList(BEARER))
                .components(new Components().addSecuritySchemes(BEARER,
                        new SecurityScheme()
                                .name(BEARER)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
