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
                        // Alertas por correo de nuevas propiedades (#99/#492): endpoints públicos
                        // para visitantes anónimos del home (alta, confirmación double opt-in y baja).
                        // El alta (POST) está rate-limited por IP en RateLimitFilter y por correo en Redis.
                        .requestMatchers("/api/v1/usuarios/alertas/**").permitAll()
                        // Ingesta de telemetría de analítica CLIENTE (ítem 455): visitantes anónimos
                        // también disparan eventos (p.ej. una búsqueda antes de loguearse). Si el
                        // caller trae JWT, AnalyticsController resuelve usuarioId igual; si no, queda
                        // null. Rate-limited por IP en RateLimitFilter (endpoint público que persiste).
                        .requestMatchers(HttpMethod.POST, "/api/v1/usuarios/analytics/eventos").permitAll()
                        // Chequeos de permiso del PROPIO usuario (RBAC dinámico #32): cualquier
                        // autenticado puede consultar SUS permisos efectivos. La gestión (CRUD de
                        // permisos) sigue restringida abajo + @PreAuthorize de método.
                        .requestMatchers(
                                "/api/v1/usuarios/permisos/check",
                                "/api/v1/usuarios/permisos/check-mio",
                                "/api/v1/usuarios/permisos/mios").authenticated()
                        .requestMatchers("/api/v1/usuarios/permisos/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/usuarios/arrendador/*/info").authenticated()
                        .requestMatchers("/api/v1/usuarios/estudiante/*/info").authenticated()
                        .requestMatchers("/api/v1/usuarios/estudiante/*/convivencia").authenticated()
                        .requestMatchers("/api/v1/usuarios/roommates").authenticated()
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
                        // Baja de cuenta propia (GDPR, G8-B): cualquier usuario autenticado puede
                        // eliminar SU cuenta (el id se resuelve del token, no de la URL).
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/usuarios/me").authenticated()
                        // Perfil propio: el usuario autenticado edita SUS datos (resueltos por el token).
                        // NOTA: esta regla va ANTES que la de preferencias-notificacion S2S de abajo
                        // para que /api/v1/usuarios/perfil/preferencias-notificacion (perfil propio)
                        // siga exigiendo autenticación — Spring Security usa la PRIMERA regla que matchea.
                        .requestMatchers("/api/v1/usuarios/perfil/**").authenticated()
                        // Variante S2S de preferencias de notificación (ítem 210): sin PII, consumida
                        // por servicio-mensajeria incluso desde consumers de Kafka sin JWT que propagar.
                        .requestMatchers(HttpMethod.GET, "/api/v1/usuarios/*/preferencias-notificacion").permitAll()
                        // Ítem 378: ids de administradores ACTIVOS, S2S sin PII — lo consume
                        // servicio-mensajeria desde un Kafka consumer (evento DOCUMENTO_SUBIDO)
                        // sin request HTTP entrante del que propagar un JWT.
                        .requestMatchers(HttpMethod.GET, "/api/v1/usuarios/admin/ids-activos").permitAll()
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
