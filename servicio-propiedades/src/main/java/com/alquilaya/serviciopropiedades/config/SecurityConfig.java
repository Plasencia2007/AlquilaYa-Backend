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
                        .requestMatchers("/api/v1/propiedades/buscar/cerca").permitAll()
                        .requestMatchers("/api/v1/propiedades/buscar/paginado").permitAll()
                        // Estadísticas agregadas de la plataforma para la home (#86): cifras públicas.
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/propiedades/stats").permitAll()
                        // Conteo de avisos por zona para la home ("Zonas destacadas"): cifras públicas agregadas.
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/propiedades/conteo-por-zona").permitAll()
                        .requestMatchers("/api/v1/propiedades/*/publico").permitAll()
                        .requestMatchers("/api/v1/propiedades/*/similares").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/propiedades/*/temporadas").permitAll()
                        .requestMatchers("/api/v1/propiedades/*/calendario").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/propiedades/*/habitaciones").permitAll()
                        // Q&A pública por propiedad (#166): cualquiera puede leer las preguntas/respuestas;
                        // crear pregunta (estudiante) y responder (arrendador) exigen autenticación (@PreAuthorize en el controller).
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/propiedades/*/preguntas").permitAll()
                        // Tracking de vista pública (#162): analítica best-effort, cualquier visitante la dispara.
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/v1/propiedades/*/vista").permitAll()
                        // Lugares cercanos / tiempo caminando (#157, #158): proxy cacheado de Overpass/OSRM, público.
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/propiedades/*/lugares-cercanos").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/propiedades/*/tiempo-caminando").permitAll()
                        .requestMatchers("/api/v1/propiedades/**").authenticated()
                        // RBAC dinámico (#32): la URL solo exige estar autenticado; el permiso fino
                        // (MODERAR_PROPIEDADES / GESTIONAR_SISTEMA) lo aplica @PreAuthorize en cada método.
                        // (Verificado: todos los endpoints bajo esta ruta tienen guard de método.)
                        .requestMatchers("/api/v1/admin/propiedades/**").authenticated()
                        .requestMatchers("/api/v1/reservas/**").authenticated()
                        .requestMatchers("/api/v1/favoritos/**").authenticated()
                        // Testimonios/prueba social para la home (#85): reseñas destacadas públicas.
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/resenas/destacadas").permitAll()
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
