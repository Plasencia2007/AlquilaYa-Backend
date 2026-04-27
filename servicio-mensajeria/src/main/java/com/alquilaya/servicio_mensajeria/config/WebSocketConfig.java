package com.alquilaya.servicio_mensajeria.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;

    @Value("${mensajeria.websocket.allowed-origins:http://localhost:3000,http://localhost:3001}")
    private String allowedOrigins;

    @Value("${mensajeria.websocket.endpoint:/ws-mensajeria}")
    private String endpoint;

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        String[] origins = allowedOrigins.split("\\s*,\\s*");
        // Sin SockJS: todos los browsers modernos soportan WebSocket nativo.
        registry.addEndpoint(endpoint)
                .setAllowedOriginPatterns(origins);
    }

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry registry) {
        // Simple broker in-memory — suficiente para una réplica. En múltiples réplicas,
        // migrar a RabbitMQ/Redis STOMP relay (ver docs/arquitectura.md).
        registry.enableSimpleBroker("/topic", "/queue");

        // Mensajes del cliente al servidor llegan con este prefijo.
        registry.setApplicationDestinationPrefixes("/app");

        // Destinos privados por usuario (Spring resuelve /user/* al Principal).
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(@NonNull ChannelRegistration registration) {
        // Intercepta frames STOMP entrantes (CONNECT, SUBSCRIBE, SEND, etc.).
        // Autentica en CONNECT y bloquea suscripciones a /topic/admin/** sin rol ADMIN.
        registration.interceptors(webSocketAuthInterceptor);
    }
}
