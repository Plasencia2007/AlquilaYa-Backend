package com.alquilaya.servicio_mensajeria.controllers;

import com.alquilaya.servicio_mensajeria.config.CurrentUser;
import com.alquilaya.servicio_mensajeria.dto.CrearMensajeRequest;
import com.alquilaya.servicio_mensajeria.dto.MensajeDTO;
import com.alquilaya.servicio_mensajeria.services.MensajeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * Handler STOMP: cliente envía a /app/chat.enviar/{id} y el servicio reenruta
 * el MensajeDTO a /user/queue/conversacion.{id} de ambos participantes.
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final MensajeService mensajeService;

    @MessageMapping("/chat.enviar/{conversacionId}")
    public void enviar(@DestinationVariable Long conversacionId,
                       @Payload @Valid CrearMensajeRequest req,
                       Principal principal) {
        CurrentUser user = extraer(principal);
        MensajeDTO dto = mensajeService.enviar(conversacionId, req, user);
        // MensajeService ya emite al destino /user/queue/conversacion.{id} de ambos participantes.
        log.debug("WS mensaje enviado conv={} msg={}", conversacionId, dto.getId());
    }

    /**
     * Indicador de "escribiendo…". El cliente publica a /app/chat.typing/{convId}
     * con `{ escribiendo: true|false }` y el servicio lo broadcast al destino
     * de eventos de la conversación para que el otro participante lo reciba.
     *
     * No persistimos nada — es estado efímero. La validación de acceso se hace
     * en MensajeService.marcarLeidos vía verificarAcceso (mismo patrón).
     */
    @MessageMapping("/chat.typing/{conversacionId}")
    public void typing(@DestinationVariable Long conversacionId,
                       @Payload TypingEvent payload,
                       Principal principal) {
        CurrentUser user = extraer(principal);
        if (user == null || user.getPerfilId() == null) return;
        // Solo participantes pueden notificar typing.
        var conv = mensajeService.verificarAccesoEnviar(conversacionId, user);
        var evento = new TypingBroadcast(conversacionId, user.getPerfilId(),
                payload != null && payload.escribiendo());
        // Reusa el destino de eventos del conv (ya consume el ChatWindow para mensajes leídos).
        mensajeService.broadcastEventoConversacion(conv, evento);
    }

    public record TypingEvent(boolean escribiendo) {}
    public record TypingBroadcast(Long conversacionId, Long emisorPerfilId, boolean escribiendo) {
        public String getTipo() { return "TYPING"; }
    }

    /**
     * Cualquier excepción en un handler WS se envía al cliente emisor
     * en su destino de error. @stomp/stompjs lo recibe como ERROR frame
     * o en el callback onStompError del cliente.
     */
    @MessageExceptionHandler
    @SendTo("/user/queue/errors")
    public String handleError(Throwable t) {
        log.warn("Error en handler WS: {}", t.getMessage());
        return "{\"error\":\"" + (t.getMessage() != null ? t.getMessage().replace("\"", "'") : "error") + "\"}";
    }

    private CurrentUser extraer(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken upat
                && upat.getPrincipal() instanceof CurrentUser cu) {
            return cu;
        }
        throw new IllegalStateException("Principal sin CurrentUser en la sesión WebSocket");
    }
}
