package com.alquilaya.serviciopropiedades.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
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

        System.out.println("🔐 [JWT FILTER] Procesando request: " + request.getRequestURI());
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            System.out.println("❌ [JWT FILTER] No hay header Authorization o no comienza con 'Bearer '");
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        System.out.println("✅ [JWT FILTER] Token extraído del header");
        
        try {
            userEmail = jwtService.extractUsername(jwt);
            System.out.println("✅ [JWT FILTER] Email extraído del token: " + userEmail);
            
            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                System.out.println("🔍 [JWT FILTER] Validando token para: " + userEmail);
                
                if (jwtService.isTokenValid(jwt, userEmail)) {
                    System.out.println("✅ [JWT FILTER] Token válido");
                    
                    // Extraer rol con seguridad
                    String rol = jwtService.extractClaim(jwt, claims -> claims.get("rol", String.class));
                    System.out.println("🎭 [JWT FILTER] Rol extraído del token: " + rol);
                    
                    if (rol != null && !rol.isEmpty()) {
                        List<SimpleGrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + rol));
                        System.out.println("✅ [JWT FILTER] Authority creado: ROLE_" + rol);
                        
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                userEmail,
                                jwt,
                                authorities
                        );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                        System.out.println("✅ [JWT FILTER] SecurityContext poblado con usuario: " + userEmail);
                    } else {
                        System.out.println("❌ [JWT FILTER] Rol vacío o nulo en el token");
                    }
                } else {
                    System.out.println("❌ [JWT FILTER] Token inválido o expirado");
                }
            } else {
                if (userEmail == null) {
                    System.out.println("❌ [JWT FILTER] No se pudo extraer email del token");
                } else {
                    System.out.println("⚠️ [JWT FILTER] Ya existe autenticación en SecurityContext");
                }
            }
        } catch (Exception e) {
            System.err.println("❌ [JWT FILTER] ERROR procesando JWT: " + e.getClass().getSimpleName() + " -> " + e.getMessage());
            e.printStackTrace();
        }
        
        filterChain.doFilter(request, response);
    }
}
