package com.plasencia.servicio_mensajeria.kafka;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plasencia.servicio_mensajeria.enums.TipoNotificacion;
import com.plasencia.servicio_mensajeria.services.NotificacionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Escucha el topic `pagos-topic` y notifica al estudiante cuando un pago se
 * confirma. El productor (servicio-pagos) emite formato simple
 * `"PAGO_EXITOSO:reservaId"` o JSON estructurado.
 *
 * Por simplicidad, sólo persistimos la notificación si podemos extraer el
 * userId del estudiante del payload. En el formato actual no viene, así que
 * aprovechamos el evento `RESERVA APROBADA→PAGADA` que `ReservaEventConsumer`
 * genera tras Kafka. Este consumer queda como placeholder: se activará cuando
 * el productor de pagos enriquezca el evento con `estudianteUserId`.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PagoEventConsumer {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final NotificacionService notificacionService;

    @KafkaListener(topics = "pagos-topic", groupId = "mensajeria-notif-group")
    public void escuchar(String mensaje) {
        log.info("📥 [NOTIF] pagos-topic: {}", mensaje);

        // Soportamos dos formatos: "PAGO_EXITOSO:123" (legacy) y JSON.
        if (mensaje == null || mensaje.isBlank()) return;

        try {
            if (mensaje.startsWith("PAGO_EXITOSO:")) {
                // Formato legacy. No hay userId — se confía en que el evento
                // RESERVA_PAGADA llegará por reserva-events con datos completos.
                log.debug("[NOTIF] formato legacy, ignorado (esperando reserva-events)");
                return;
            }

            Map<String, Object> payload = objectMapper.readValue(mensaje, new TypeReference<>() {});
            Long estudianteUserId = toLong(payload.get("estudianteUserId"));
            if (estudianteUserId == null) {
                log.debug("[NOTIF] payload sin estudianteUserId: {}", payload);
                return;
            }
            Long reservaId = toLong(payload.get("reservaId"));

            Map<String, Object> datos = new HashMap<>();
            if (reservaId != null) datos.put("reservaId", reservaId);
            if (payload.get("monto") != null) datos.put("monto", payload.get("monto"));

            notificacionService.crear(estudianteUserId, TipoNotificacion.RESERVA_PAGADA,
                    "Pago confirmado",
                    "Recibimos tu pago. Tu reserva está confirmada.",
                    "/student/reservations", datos, true);
        } catch (Exception e) {
            log.error("Fallo procesando pagos-topic: {}", e.getMessage());
        }
    }

    private static Long toLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try { return Long.parseLong(v.toString()); } catch (NumberFormatException e) { return null; }
    }
}
