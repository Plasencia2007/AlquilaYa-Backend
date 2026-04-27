package com.alquilaya.servicio_mensajeria.services;

import com.alquilaya.servicio_mensajeria.entities.Conversacion;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Wrapper sobre SimpMessagingTemplate: centraliza el envío de mensajes/eventos
 * por WebSocket a los dos participantes de una conversación.
 *
 * Los destinos se resuelven con /user/{userId}/queue/... — el frontend se suscribe
 * a /user/queue/... y Spring entrega al Principal correcto de cada sesión.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Envía el mismo payload a los userIds (del JWT) de estudiante y arrendador
     * al destino /user/queue/conversacion.{convId}.
     */
    public void enviarAParticipantes(Conversacion conv, Long estudianteUserId, Long arrendadorUserId, Object payload) {
        String destino = "/queue/conversacion." + conv.getId();
        if (estudianteUserId != null) {
            messagingTemplate.convertAndSendToUser(estudianteUserId.toString(), destino, payload);
        }
        if (arrendadorUserId != null) {
            messagingTemplate.convertAndSendToUser(arrendadorUserId.toString(), destino, payload);
        }
        log.debug("WS → convId={} destino={}", conv.getId(), destino);
    }

    /**
     * Envía un evento del canal de eventos de la conversación (p.ej. MENSAJE_LEIDO,
     * CONVERSACION_SUSPENDIDA) para que la UI reaccione sin polling.
     */
    public void enviarEventoAParticipantes(Conversacion conv, Long estudianteUserId, Long arrendadorUserId, Object evento) {
        String destino = "/queue/conversacion." + conv.getId() + ".eventos";
        if (estudianteUserId != null) {
            messagingTemplate.convertAndSendToUser(estudianteUserId.toString(), destino, evento);
        }
        if (arrendadorUserId != null) {
            messagingTemplate.convertAndSendToUser(arrendadorUserId.toString(), destino, evento);
        }
    }

    /** Broadcast al dashboard admin (solo suscriptores con rol ADMIN — ver interceptor). */
    public void broadcastAdmin(Object payload) {
        messagingTemplate.convertAndSend("/topic/admin/mensajes-nuevos", payload);
    }
}
