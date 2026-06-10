package com.alquilaya.serviciousuarios.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final RateLimitFilter rateLimitFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        // Documentacion Swagger / OpenAPI: acceso libre
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/swagger-resources/**", "/webjars/**").permitAll()
                        .requestMatchers("/api/v1/usuarios/auth/**").permitAll()
                        .requestMatchers("/api/v1/usuarios/permisos/check").authenticated()
                        .requestMatchers("/api/v1/usuarios/permisos/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/usuarios/arrendador/*/info").authenticated()
                        .requestMatchers("/api/v1/usuarios/estudiante/*/info").authenticated()
                        // Bulk para enriquecer listados de propiedades (card premium).
                        // Mismo nivel que el endpoint single: cualquier usuario autenticado.
                        .requestMatchers(HttpMethod.POST, "/api/v1/usuarios/arrendadores/bulk").authenticated()
                        // Variante PÚBLICA del bulk: sin PII (correo/telefono excluidos).
                        // Permite enriquecer cards en el listado público para visitantes anónimos.
                        .requestMatchers(HttpMethod.POST, "/api/v1/usuarios/arrendadores/bulk-publico").permitAll()
                        .requestMatchers("/api/v1/usuarios/documentos/**").authenticated()
                        .requestMatchers(HttpMethod.GET,  "/api/v1/usuarios/{id}").authenticated()
                        .requestMatchers(HttpMethod.PUT,  "/api/v1/usuarios/{id}").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/usuarios/{id}/cambiar-password").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/usuarios/{id}/foto").authenticated()
                        .requestMatchers("/api/v1/usuarios/**").hasRole("ADMIN") // Gestión de usuarios exclusiva para ADMIN
                        .anyRequest().authenticated())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Rate-limit corre ANTES del JWT filter para bloquear brute force
                // sin consumir recursos de validación.
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
