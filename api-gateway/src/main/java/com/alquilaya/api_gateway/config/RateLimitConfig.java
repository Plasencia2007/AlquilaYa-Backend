package com.alquilaya.api_gateway.config;

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

    public RateLimitConfig(RateLimitGlobalFilter rateLimitFilter) {
        this.rateLimitFilter = rateLimitFilter;
    }

    @Override
    public void addInterceptors(@NonNull InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitFilter)
                .addPathPatterns("/**");
    }
}
