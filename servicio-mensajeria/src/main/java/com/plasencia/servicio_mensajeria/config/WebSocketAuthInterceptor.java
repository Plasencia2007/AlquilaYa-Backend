package com.plasencia.servicio_mensajeria.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

/**
 * Autentica la sesión STOMP en el frame CONNECT leyendo "Authorization: Bearer <jwt>"
 * de los headers STOMP (que el cliente pasa vía connectHeaders). También bloquea
 * suscripciones a /topic/admin/** si el rol no es ADMIN.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();
        if (command == null) {
            return message;
        }

        switch (command) {
            case CONNECT -> autenticar(accessor);
            case SUBSCRIBE -> validarSuscripcion(accessor);
            default -> { /* no-op */ }
        }

        return message;
    }

    private void autenticar(StompHeaderAccessor accessor) {
        String authHeader = firstHeader(accessor, "Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new AccessDeniedException("WebSocket CONNECT sin token");
        }
        String jwt = authHeader.substring(7);

        final String email;
        try {
            email = jwtService.extractUsername(jwt);
        } catch (Exception e) {
            log.warn("[WS] Token malformado: {}", e.getMessage());
            throw new AccessDeniedException("Token inválido");
        }

        if (email == null || !jwtService.isTokenValid(jwt, email)) {
            throw new AccessDeniedException("Token expirado o inválido");
        }

        String rol = jwtService.extractClaim(jwt, claims -> claims.get("rol", String.class));
        Long userId = jwtService.extractClaim(jwt, claims -> claims.get("userId", Long.class));
        Long perfilId = jwtService.extractClaim(jwt, claims -> claims.get("perfilId", Long.class));

        if (rol == null || rol.isEmpty()) {
            throw new AccessDeniedException("Token sin rol");
        }

        CurrentUser currentUser = CurrentUser.builder()
                .userId(userId)
                .perfilId(perfilId)
                .email(email)
                .rol(rol)
                .build();

        List<SimpleGrantedAuthority> authorities =
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + rol));
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(currentUser, jwt, authorities);

        // Principal queda accesible para convertAndSendToUser y @MessageMapping.
        accessor.setUser(auth);
        log.debug("[WS] Conectado: {} rol={} perfilId={}", email, rol, perfilId);
    }

    private void validarSuscripcion(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) return;

        Object principal = accessor.getUser() instanceof UsernamePasswordAuthenticationToken upat
                ? upat.getPrincipal() : null;

        // /topic/admin/** solo para admins.
        if (destination.startsWith("/topic/admin/")) {
            if (!(principal instanceof CurrentUser cu) || !"ADMIN".equalsIgnoreCase(cu.getRol())) {
                throw new AccessDeniedException("Suscripción a /topic/admin requiere rol ADMIN");
            }
        }

        // /topic/notificaciones.{userId} solo para el dueño del userId.
        if (destination.startsWith("/topic/notificaciones.")) {
            if (!(principal instanceof CurrentUser cu) || cu.getUserId() == null) {
                throw new AccessDeniedException("Sesión sin userId");
            }
            String suffix = destination.substring("/topic/notificaciones.".length());
            if (!cu.getUserId().toString().equals(suffix)) {
                throw new AccessDeniedException("Solo puedes suscribirte a tus propias notificaciones");
            }
        }
    }

    private static String firstHeader(StompHeaderAccessor accessor, String name) {
        List<String> values = accessor.getNativeHeader(name);
        if (values == null || values.isEmpty()) return null;
        return values.get(0);
    }
}
