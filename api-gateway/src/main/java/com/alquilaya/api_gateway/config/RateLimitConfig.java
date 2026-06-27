package com.alquilaya.api_gateway.config;

import com.alquilaya.api_gateway.filter.JwtRevocationInterceptor;
import com.alquilaya.api_gateway.filter.RateLimitGlobalFilter;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registra {@link RateLimitGlobalFilter} como interceptor MVC global.
 *
 * <p>El interceptor se aplica a todas las rutas ({@code /**}) para que el
 * límite de peticiones se evalúe antes de que el gateway reenvíe la solicitud
 * a los servicios downstream.
 */
@Configuration
public class RateLimitConfig implements WebMvcConfigurer {

    private final RateLimitGlobalFilter rateLimitFilter;
    private final JwtRevocationInterceptor jwtRevocationInterceptor;

    public RateLimitConfig(RateLimitGlobalFilter rateLimitFilter,
                           JwtRevocationInterceptor jwtRevocationInterceptor) {
        this.rateLimitFilter = rateLimitFilter;
        this.jwtRevocationInterceptor = jwtRevocationInterceptor;
    }

    /**
     * Rutas de documentación (Swagger UI agregado + specs OpenAPI proxeadas) que
     * NO deben pasar por rate-limit ni por la revocación de JWT: son públicas y la
     * UI carga muchos recursos estáticos.
     */
    private static final String[] DOCS = {
            "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**",
            "/swagger-resources/**", "/webjars/**"
    };

    @Override
    public void addInterceptors(@NonNull InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitFilter)
                .addPathPatterns("/**")
                .excludePathPatterns(DOCS);
        // Rechaza tokens revocados (logout / cierre remoto) en un solo punto para todos
        // los servicios. Va después del rate-limit.
        registry.addInterceptor(jwtRevocationInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns(DOCS);
    }
}
