package com.alquilaya.servicio_mensajeria.config;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * S5: el access token vive en un cookie httpOnly — JavaScript no puede leerlo para armar el
 * header {@code Authorization} del frame STOMP CONNECT (como se hacía antes). Este
 * interceptor corre en el HANDSHAKE HTTP (antes del upgrade a WebSocket), momento en el que
 * el cookie SÍ viaja automáticamente (es una petición HTTP normal) — lo lee y lo guarda en
 * los "attributes" de la sesión WS, donde {@link WebSocketAuthInterceptor#autenticar} lo
 * recupera como fallback si el frame CONNECT no trae ya un header Authorization explícito
 * (compatibilidad con clientes no-browser que sigan mandándolo ellos mismos).
 */
@Component
public class WebSocketCookieHandshakeInterceptor implements HandshakeInterceptor {

    static final String ATTR_JWT = "jwt-from-cookie";
    private static final String COOKIE_NAME = "auth-token";

    @Override
    public boolean beforeHandshake(@NonNull ServerHttpRequest request, @NonNull ServerHttpResponse response,
                                   @NonNull WebSocketHandler wsHandler, @NonNull Map<String, Object> attributes) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            HttpServletRequest http = servletRequest.getServletRequest();
            String token = leerCookie(http, COOKIE_NAME);
            if (token != null && !token.isBlank()) {
                attributes.put(ATTR_JWT, token);
            }
        }
        return true; // nunca bloquea el handshake acá; la autenticación real la hace el CONNECT
    }

    @Override
    public void afterHandshake(@NonNull ServerHttpRequest request, @NonNull ServerHttpResponse response,
                               @NonNull WebSocketHandler wsHandler, @Nullable Exception exception) {
        // no-op
    }

    private static String leerCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if (name.equals(c.getName())) return c.getValue();
        }
        return null;
    }
}
