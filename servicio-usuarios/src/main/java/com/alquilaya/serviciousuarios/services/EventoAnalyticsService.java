package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.EventoAnalyticsItemDTO;
import com.alquilaya.serviciousuarios.dto.ResumenEventoAnalyticsDTO;
import com.alquilaya.serviciousuarios.entities.EventoAnalytics;
import com.alquilaya.serviciousuarios.repositories.EventoAnalyticsRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Ingesta del sink backend de la telemetría de analítica CLIENTE (ítem 455; ver
 * {@code src/lib/analytics.ts} del frontend).
 *
 * <h3>Decisiones de diseño</h3>
 * <ul>
 *   <li><b>Sin retención/expurgo automático:</b> cuánto tiempo conservar esta telemetría (y si
 *       anonimizar {@code usuarioId} tras cierto tiempo) es una decisión de producto pendiente,
 *       no implementada aquí a propósito.</li>
 *   <li><b>{@code fechaCreacion} usa el reloj del SERVIDOR</b>, no el {@code timestamp} que manda
 *       el cliente (informativo, no confiable): evita que un reloj de cliente desfasado -o
 *       manipulado- ensucie los agregados por rango de fecha del panel admin.</li>
 *   <li><b>Anti-abuso "todo o nada" por batch:</b> si algún evento del batch excede el tamaño
 *       máximo de {@code props} (4KB), se rechaza el batch completo con 400 (ver
 *       {@code GlobalExceptionHandler#handleBadRequest}) en vez de descartar en silencio ese
 *       evento -- el batch entero es una única transacción.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EventoAnalyticsService {

    /** Tamaño máximo del JSON serializado de `props` por evento (anti-abuso). */
    private static final int MAX_PROPS_BYTES = 4096;

    private final EventoAnalyticsRepository repository;
    private final ObjectMapper objectMapper;

    /**
     * Persiste cada evento del batch. {@code usuarioId} ya viene resuelto por el controller
     * (del JWT si el caller estaba autenticado, o {@code null} si es anónimo) y aplica a TODOS
     * los eventos del batch (un batch es de un único caller/sesión de navegador).
     *
     * @return número de eventos persistidos (== tamaño del batch; si algo falla se rechaza todo
     *         el batch vía excepción, nunca hay persistencia parcial silenciosa).
     */
    @Transactional
    public int registrarBatch(List<EventoAnalyticsItemDTO> eventos, Long usuarioId) {
        LocalDateTime ahora = LocalDateTime.now();
        int aceptados = 0;
        for (EventoAnalyticsItemDTO item : eventos) {
            String propiedadesJson = serializarProps(item.getEvento(), item.getProps());
            EventoAnalytics entidad = EventoAnalytics.builder()
                    .evento(item.getEvento().trim())
                    .propiedades(propiedadesJson)
                    .usuarioId(usuarioId)
                    .sessionId(item.getSessionId())
                    .fechaCreacion(ahora)
                    .build();
            repository.save(entidad);
            aceptados++;
        }
        log.debug("[Analytics] Batch ingerido: {} eventos (usuarioId={})", aceptados, usuarioId);
        return aceptados;
    }

    /** Conteo de eventos por tipo dentro de {@code [desde, hasta)}, para el panel admin. */
    @Transactional(readOnly = true)
    public List<ResumenEventoAnalyticsDTO> resumen(LocalDateTime desde, LocalDateTime hasta) {
        return repository.resumenPorEvento(desde, hasta);
    }

    /** Serializa `props` a JSON y valida su tamaño (anti-abuso). Null/vacío -> null (nada que guardar). */
    private String serializarProps(String evento, Map<String, Object> props) {
        if (props == null || props.isEmpty()) return null;
        try {
            String json = objectMapper.writeValueAsString(props);
            int bytes = json.getBytes(StandardCharsets.UTF_8).length;
            if (bytes > MAX_PROPS_BYTES) {
                throw new IllegalArgumentException(
                        "El evento '" + evento + "' excede el tamaño máximo de props permitido ("
                                + MAX_PROPS_BYTES + " bytes)");
            }
            return json;
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException(
                    "El campo props del evento '" + evento + "' no se pudo serializar a JSON");
        }
    }
}
