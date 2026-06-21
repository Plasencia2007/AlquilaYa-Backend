package com.alquilaya.serviciopropiedades.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity // Habilitar PreAuthorize para la matriz de permisos
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        // Documentacion Swagger / OpenAPI: acceso libre
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/swagger-resources/**", "/webjars/**").permitAll()
                        .requestMatchers("/api/v1/propiedades/buscar").permitAll()
                        .requestMatchers("/api/v1/propiedades/*/publico").permitAll()
                        .requestMatchers("/api/v1/propiedades/*/calendario").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/propiedades/*/habitaciones").permitAll()
                        .requestMatchers("/api/v1/propiedades/**").authenticated()
                        .requestMatchers("/api/v1/admin/propiedades/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/reservas/**").authenticated()
                        .requestMatchers("/api/v1/favoritos/**").authenticated()
                        .requestMatchers("/api/v1/resenas/propiedad/*").permitAll()
                        .requestMatchers("/api/v1/resenas/arrendador/*").permitAll()
                        .requestMatchers("/api/v1/resenas/**").authenticated()
                        .requestMatchers("/api/v1/dashboard/**").authenticated()
                        .anyRequest().authenticated())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
