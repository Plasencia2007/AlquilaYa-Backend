package com.alquilaya.serviciopropiedades.kafka;

import com.alquilaya.serviciopropiedades.outbox.publisher.OutboxPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Wrapper sobre {@link OutboxPublisher} que mantiene la firma legacy
 * {@code emitir(tipo, reservaId, extra)} para que no haga falta editar
 * todos los call sites en {@link com.alquilaya.serviciopropiedades.services.ReservaService}.
 *
 * Mapea {@code tipo} legacy → {@code eventType} canónico del catálogo (§04). Hoy los
 * `tipo` ya están en formato canónico ({@code RESERVA_SOLICITADA}, etc.) por lo que el
 * mapeo es idempotente, pero se centraliza aquí para soportar futuros renombres.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReservaEventProducer {

    private static final String TOPIC = "reserva-events";
    private static final String AGGREGATE_TYPE = "Reserva";

    private static final Set<String> EVENT_TYPES_CANONICOS = Set.of(
            "RESERVA_SOLICITADA",
            "RESERVA_APROBADA",
            "RESERVA_RECHAZADA",
            "RESERVA_PAGADA",
            "RESERVA_CANCELADA",
            "RESERVA_FINALIZADA",
            "RESERVA_EXPIRADA",
            "RESERVA_PAGO_PENDIENTE"
    );

    private final OutboxPublisher outboxPublisher;

    /**
     * Persiste el evento en outbox_events dentro de la transacción del caller.
     * El scheduler lo publicará a Kafka.
     */
    public void emitir(String tipo, Long reservaId, Map<String, Object> extra) {
        String eventType = mapearTipo(tipo);
        if (!EVENT_TYPES_CANONICOS.contains(eventType)) {
            log.warn("ReservaEventProducer.emitir: tipo desconocido '{}'. Se usará tal cual.", tipo);
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("reservaId", reservaId);
        if (extra != null) payload.putAll(extra);

        log.info("[RESERVA] Persistiendo en outbox {} para reserva {}", eventType, reservaId);
        outboxPublisher.publicar(
                TOPIC,
                eventType,
                AGGREGATE_TYPE,
                String.valueOf(reservaId),
                payload,
                MDC.get("correlationId"));
    }

    /** Hook de mapeo legacy → canónico. Hoy es identidad. */
    private String mapearTipo(String tipo) {
        if (tipo == null) return "";
        return tipo;
    }
}
