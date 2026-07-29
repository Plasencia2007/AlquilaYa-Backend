package com.alquilaya.servicio_mensajeria.config;

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
    private final JwtBlacklistChecker jwtBlacklistChecker;

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
        String jwt;
        String authHeader = firstHeader(accessor, "Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwt = authHeader.substring(7);
        } else {
            // S5: sin header explícito (JS ya no puede leer el access token — vive en un
            // cookie httpOnly), cae al JWT que WebSocketCookieHandshakeInterceptor guardó
            // en los session attributes al leer el cookie durante el handshake HTTP.
            Object fromCookie = accessor.getSessionAttributes() != null
                    ? accessor.getSessionAttributes().get(WebSocketCookieHandshakeInterceptor.ATTR_JWT)
                    : null;
            if (!(fromCookie instanceof String s) || s.isBlank()) {
                throw new AccessDeniedException("WebSocket CONNECT sin token");
            }
            jwt = s;
        }

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

        // La revocación de sesión (logout) debe cortar también el WebSocket. S8:
        // antes el WS sólo miraba firma/expiración y aceptaba un token revocado hasta 24h.
        if (jwtBlacklistChecker.isBlacklisted(jwt)) {
            log.warn("[WS] CONNECT con token revocado (logout) rechazado para {}", email);
            throw new AccessDeniedException("Sesión cerrada. Vuelve a iniciar sesión.");
        }

        // Ítem 379: un token de impersonación (admin viendo como otro usuario) es de SOLO
        // LECTURA. El gateway (ImpersonationReadOnlyInterceptor) ya bloquea toda mutación REST,
        // pero el WS de mensajería conecta DIRECTO a este servicio sin pasar por el gateway —
        // así que sin este check, un admin impersonando podría enviar/leer mensajes de chat
        // como el usuario objetivo. Se rechaza el CONNECT completo (no solo el envío) porque no
        // hay forma de "solo lectura" a nivel STOMP sin bloquear también las suscripciones.
        Boolean impersonacion = jwtService.extractClaim(jwt, claims -> claims.get("impersonacion", Boolean.class));
        if (Boolean.TRUE.equals(impersonacion)) {
            log.warn("[WS] CONNECT con token de impersonación rechazado para {}", email);
            throw new AccessDeniedException("El chat no está disponible en modo de solo lectura.");
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
