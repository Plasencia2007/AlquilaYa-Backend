package com.alquilaya.servicio_mensajeria.services;

import com.alquilaya.servicio_mensajeria.enums.RolEmisor;
import com.alquilaya.servicio_mensajeria.kafka.ReputacionMetricaProducer;
import com.alquilaya.servicio_mensajeria.repositories.ConversacionRepository;
import com.alquilaya.servicio_mensajeria.repositories.MensajeRepository;
import com.alquilaya.servicio_mensajeria.repositories.projection.MensajeTiempoRespuestaView;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * Calcula el "tiempo de respuesta promedio" (minutos) de cada arrendador a partir de los
 * timestamps de los mensajes del chat, y emite el resultado como señal Kafka de reputación
 * ({@code TIEMPO_RESPUESTA_ARRENDADOR_ACTUALIZADO} → {@code resenas-topic}) que
 * servicio-usuarios consume.
 *
 * <h2>Definición de la métrica</h2>
 * Para cada conversación, se recorren sus mensajes en orden cronológico ascendente. El
 * "tiempo de respuesta" de una <em>tanda</em> es el delta entre el <strong>primer</strong>
 * mensaje del ESTUDIANTE que quedó sin responder y el <strong>primer</strong> mensaje del
 * ARRENDADOR que llega después. Decisiones:
 * <ul>
 *   <li><b>Ancla = primer mensaje de la tanda.</b> Si el estudiante manda varios mensajes
 *       seguidos, el reloj corre desde el primero (es el tiempo real que esperó por una
 *       respuesta), no desde el último.</li>
 *   <li><b>Un delta por tanda.</b> Tras contabilizar la respuesta del arrendador, los
 *       siguientes mensajes suyos consecutivos NO generan más deltas; el reloj se rearma
 *       sólo cuando el estudiante vuelve a escribir. Así no se sesga por ráfagas.</li>
 *   <li><b>Sin respuesta ⇒ no aporta.</b> Una tanda del estudiante que el arrendador nunca
 *       contestó simplemente no produce delta (no cuenta como "infinito").</li>
 *   <li><b>Acotado de outliers.</b> Deltas mayores a {@code maxDeltaMinutos} (default 7 días)
 *       se descartan: suelen ser conversaciones abandonadas y retomadas, que inflarían el
 *       promedio sin reflejar el comportamiento habitual.</li>
 *   <li><b>Datos insuficientes ⇒ {@code null}.</b> Si el arrendador no tiene ningún par
 *       estudiante→arrendador válido, el resultado es {@code null} y NO se emite señal
 *       (el valor en usuarios queda en su default {@code null}; como los mensajes sólo se
 *       acumulan, un valor numérico nunca "regresa" a null, así que no hace falta resetear).</li>
 *   <li>Se excluyen mensajes {@code BLOQUEADO} (moderados) del cálculo.</li>
 * </ul>
 *
 * <h2>Enfoque de cálculo y coste</h2>
 * Java en streaming por arrendador: un query trae —en proyección ligera de 3 columnas— los
 * mensajes de todas las conversaciones del arrendador, ordenados por (conversación, fecha),
 * y un solo recorrido lineal calcula el promedio. Coste: 1 query "distinct arrendadores" +
 * 1 query por arrendador; memoria acotada a los mensajes de un arrendador a la vez (nunca el
 * universo completo). Se prefirió Java sobre window functions SQL por legibilidad del anclado
 * "primer mensaje de la tanda" y del acotado de outliers.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TiempoRespuestaService {

    private final ConversacionRepository conversacionRepository;
    private final MensajeRepository mensajeRepository;
    private final ReputacionMetricaProducer reputacionMetricaProducer;

    /**
     * Recalcula la métrica de todos los arrendadores con conversaciones y emite una señal
     * por cada uno con dato suficiente. Un fallo aislado (cálculo o emisión) se registra y
     * NO aborta el resto del lote.
     *
     * @param maxDeltaMinutos tope para acotar outliers (deltas mayores se descartan).
     * @return número de señales emitidas.
     */
    public int recalcularYEmitirTodos(long maxDeltaMinutos) {
        List<Long> arrendadorIds = conversacionRepository.findArrendadorIdsDistintos();
        int emitidos = 0;
        int sinDatos = 0;
        for (Long arrendadorId : arrendadorIds) {
            if (arrendadorId == null) continue;
            try {
                Integer minutos = calcularParaArrendador(arrendadorId, maxDeltaMinutos);
                if (minutos == null) {
                    sinDatos++;
                    continue; // datos insuficientes: no se emite señal
                }
                reputacionMetricaProducer.emitirTiempoRespuesta(arrendadorId, minutos);
                emitidos++;
            } catch (Exception e) {
                log.warn("[METRICA] Falló tiempo de respuesta arrendador {}: {}",
                        arrendadorId, e.getMessage());
            }
        }
        log.info("[METRICA] Tiempo de respuesta recalculado: arrendadores={}, emitidos={}, sinDatos={}",
                arrendadorIds.size(), emitidos, sinDatos);
        return emitidos;
    }

    /**
     * Promedio del tiempo de respuesta (minutos, redondeado) de un arrendador, o {@code null}
     * si no tiene ningún par estudiante→arrendador válido. Ver reglas en el Javadoc de clase.
     */
    @Transactional(readOnly = true)
    public Integer calcularParaArrendador(Long arrendadorId, long maxDeltaMinutos) {
        List<MensajeTiempoRespuestaView> mensajes =
                mensajeRepository.findParaMetricaTiempoRespuesta(arrendadorId);

        long maxDeltaSegundos = maxDeltaMinutos * 60L;
        long totalSegundos = 0L;
        int pares = 0;

        Long convActual = null;
        // Timestamp del primer mensaje del estudiante en la tanda actual aún sin responder.
        LocalDateTime anclaEstudiante = null;

        for (MensajeTiempoRespuestaView m : mensajes) {
            if (!Objects.equals(m.getConversacionId(), convActual)) {
                // Frontera de conversación: se reinicia la tanda (no se cruza entre conversaciones).
                convActual = m.getConversacionId();
                anclaEstudiante = null;
            }

            if (m.getEmisorRol() == RolEmisor.ESTUDIANTE) {
                if (anclaEstudiante == null) {
                    anclaEstudiante = m.getFechaEnvio(); // ancla = primer mensaje de la tanda
                }
                // Dentro de la tanda: se conserva el ancla (el primero), no se sobrescribe.
            } else if (m.getEmisorRol() == RolEmisor.ARRENDADOR) {
                if (anclaEstudiante != null) {
                    long deltaSeg = Duration.between(anclaEstudiante, m.getFechaEnvio()).getSeconds();
                    if (deltaSeg >= 0 && deltaSeg <= maxDeltaSegundos) {
                        totalSegundos += deltaSeg;
                        pares++;
                    }
                    // Tanda respondida: se rearma sólo cuando el estudiante vuelva a escribir.
                    anclaEstudiante = null;
                }
                // Arrendador sin tanda pendiente (mensaje que él inició o consecutivo): se ignora.
            }
        }

        if (pares == 0) {
            return null; // datos insuficientes
        }
        return (int) Math.round((totalSegundos / 60.0) / pares);
    }
}
