package com.alquilaya.servicio_catalogos.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
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
                        .requestMatchers("/api/v1/catalogos/filtros/activos").permitAll()
                        .requestMatchers("/api/v1/catalogos/filtros/tipo/**").permitAll()
                        // Listados públicos: el registro de estudiantes (usuario anónimo) y la
                        // búsqueda pública leen universidades y carreras activas sin JWT.
                        .requestMatchers(org.springframework.http.HttpMethod.GET,
                                "/api/v1/catalogos/universidades", "/api/v1/catalogos/carreras").permitAll()
                        // Campus principal y zonas activas: los leen propiedades/usuarios sin JWT
                        // (seed, búsqueda anónima, resolución de zona al publicar).
                        .requestMatchers("/api/v1/catalogos/universidades/principal").permitAll()
                        .requestMatchers("/api/v1/catalogos/universidades/zonas/activas").permitAll()
                        // Rutas admin de cada controlador del catálogo: solo ADMIN.
                        // (defensa a nivel de URL, además del @PreAuthorize de cada método)
                        .requestMatchers("/api/v1/catalogos/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/catalogos/universidades/admin", "/api/v1/catalogos/universidades/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/catalogos/carreras/admin", "/api/v1/catalogos/carreras/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
