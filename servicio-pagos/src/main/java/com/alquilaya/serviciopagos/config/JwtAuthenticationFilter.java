package com.alquilaya.serviciopagos.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userEmail;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);

        try {
            userEmail = jwtService.extractUsername(jwt);

            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                if (jwtService.isTokenValid(jwt, userEmail)) {
                    String rol = jwtService.extractClaim(jwt, claims -> claims.get("rol", String.class));
                    Long userId = jwtService.extractClaim(jwt, claims -> claims.get("userId", Long.class));
                    Long perfilId = jwtService.extractClaim(jwt, claims -> claims.get("perfilId", Long.class));

                    if (rol != null && !rol.isEmpty()) {
                        CurrentUser currentUser = CurrentUser.builder()
                                .userId(userId)
                                .perfilId(perfilId)
                                .email(userEmail)
                                .rol(rol)
                                .build();

                        List<SimpleGrantedAuthority> authorities = Collections.singletonList(
                                new SimpleGrantedAuthority("ROLE_" + rol));
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                currentUser,
                                jwt,
                                authorities
                        );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                        log.debug("[JWT] Autenticado: {} rol={} userId={} perfilId={}", userEmail, rol, userId, perfilId);
                    } else {
                        log.warn("[JWT] Token sin claim de rol para: {}", userEmail);
                    }
                } else {
                    log.warn("[JWT] Token inválido o expirado para: {}", userEmail);
                }
            }
        } catch (Exception e) {
            log.error("[JWT] Error procesando token: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}
