package com.alquilaya.servicio_mensajeria.scheduler;

import com.alquilaya.servicio_mensajeria.services.TiempoRespuestaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Job periódico que recalcula el tiempo de respuesta promedio de cada arrendador y lo emite
 * como señal Kafka de reputación. Reemite en cada corrida (cada emisión lleva su propio
 * {@code eventId}, de modo que usuarios —idempotente por eventId— refresca el valor).
 *
 * <p>Configurable:
 * <ul>
 *   <li>{@code mensajeria.metrica.tiempo-respuesta.cron} — default diario 04:00.</li>
 *   <li>{@code mensajeria.metrica.tiempo-respuesta.enabled} — default {@code true}.</li>
 *   <li>{@code mensajeria.metrica.tiempo-respuesta.max-delta-minutos} — tope anti-outliers,
 *       default 10080 (7 días).</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TiempoRespuestaScheduler {

    private final TiempoRespuestaService tiempoRespuestaService;

    @Value("${mensajeria.metrica.tiempo-respuesta.enabled:true}")
    private boolean enabled;

    @Value("${mensajeria.metrica.tiempo-respuesta.max-delta-minutos:10080}")
    private long maxDeltaMinutos;

    @Scheduled(cron = "${mensajeria.metrica.tiempo-respuesta.cron:0 0 4 * * *}")
    public void recalcularTiempoRespuesta() {
        if (!enabled) {
            log.debug("[METRICA] Scheduler tiempo de respuesta deshabilitado");
            return;
        }
        try {
            tiempoRespuestaService.recalcularYEmitirTodos(maxDeltaMinutos);
        } catch (Exception e) {
            // Salvaguarda: el service ya aísla fallos por-arrendador; esto cubre un fallo
            // global (p.ej. el query de arrendadores) para que el scheduler no se rompa.
            log.error("[METRICA] Falló el ciclo de tiempo de respuesta: {}", e.getMessage(), e);
        }
    }
}
