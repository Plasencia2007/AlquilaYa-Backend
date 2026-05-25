package com.alquilaya.serviciopropiedades.saga.scheduler;

import com.alquilaya.serviciopropiedades.saga.entity.EstadoSaga;
import com.alquilaya.serviciopropiedades.saga.entity.SagaReservaPago;
import com.alquilaya.serviciopropiedades.saga.repository.SagaReservaPagoRepository;
import com.alquilaya.serviciopropiedades.saga.service.SagaReservaPagoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Reintenta periódicamente las compensaciones de sagas que quedaron en
 * {@link EstadoSaga#COMPENSANDO} (emisión de {@code REFUND_REQUERIDO} fallida).
 *
 * Estrategia:
 *  - fixedDelay = 10s — suficiente para reaccionar pero no spammear el broker.
 *  - El servicio orquestador es el dueño de la transacción (anotado @Transactional);
 *    aquí solo orquestamos la lista de IDs a reintentar.
 *  - Si una saga supera {@link SagaReservaPagoService#MAX_INTENTOS}, el propio
 *    {@code reintentarCompensacion} la marca como {@link EstadoSaga#FALLIDA} y loguea ERROR.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SagaCompensationScheduler {

    private final SagaReservaPagoRepository sagaRepository;
    private final SagaReservaPagoService sagaService;

    @Scheduled(fixedDelay = 10_000L)
    public void reintentarCompensaciones() {
        List<SagaReservaPago> pendientes;
        try {
            pendientes = sagaRepository.findPendientesCompensacion(
                    EstadoSaga.COMPENSANDO, SagaReservaPagoService.MAX_INTENTOS);
        } catch (Exception e) {
            log.debug("SagaCompensationScheduler: no se pudo leer pendientes ({}). Reintenta luego.",
                    e.getMessage());
            return;
        }

        if (pendientes.isEmpty()) return;

        log.info("SagaCompensationScheduler: {} sagas pendientes de compensación", pendientes.size());
        for (SagaReservaPago saga : pendientes) {
            try {
                sagaService.reintentarCompensacion(saga.getSagaId());
            } catch (Exception e) {
                log.warn("Reintento compensación saga {} falló: {}", saga.getSagaId(), e.getMessage());
            }
        }
    }
}
