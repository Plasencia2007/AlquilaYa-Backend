package com.alquilaya.serviciopropiedades.saga.service;

import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.outbox.envelope.EventEnvelope;
import com.alquilaya.serviciopropiedades.outbox.publisher.OutboxPublisher;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import com.alquilaya.serviciopropiedades.saga.entity.EstadoSaga;
import com.alquilaya.serviciopropiedades.saga.entity.PasoSaga;
import com.alquilaya.serviciopropiedades.saga.entity.SagaReservaPago;
import com.alquilaya.serviciopropiedades.saga.repository.SagaReservaPagoRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Orquestador central de la Saga reserva-pago (Ola 3).
 *
 * <h3>Casos cubiertos</h3>
 * <ol>
 *   <li>Pago exitoso mientras la reserva está APROBADA → ruta feliz: PAGADA + saga COMPLETADA.</li>
 *   <li>Pago exitoso pero reserva ya CANCELADA/RECHAZADA → emitir
 *       {@code REFUND_REQUERIDO} (compensación). Si falla, queda en COMPENSANDO
 *       y el {@link com.alquilaya.serviciopropiedades.saga.scheduler.SagaCompensationScheduler}
 *       reintenta.</li>
 *   <li>Arrendador cancela una reserva PAGADA o con saga en curso → idem refund.</li>
 * </ol>
 *
 * <h3>Idempotencia</h3>
 * Si una saga ya está {@link EstadoSaga#COMPLETADA} o {@link EstadoSaga#FALLIDA}, las
 * llamadas posteriores son no-op (con log). La idempotencia "no doble procesar el mismo
 * eventId" vive en el {@code PagoEventListener}; aquí garantizamos consistencia de estado.
 *
 * <h3>Locking</h3>
 * {@link SagaReservaPago#getVersion()} con {@code @Version}: si dos hilos pisan la misma
 * saga (raro pero posible), uno reintenta vía el manejo de transacciones de Spring.
 */
@Slf4j
@Service
public class SagaReservaPagoService {

    public static final String TOPIC_PAGOS = "pagos-topic";
    public static final String EVENT_TYPE_REFUND = "REFUND_REQUERIDO";
    public static final int MAX_INTENTOS = 5;

    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .addModule(new JavaTimeModule())
            .build();

    private final SagaReservaPagoRepository sagaRepository;
    private final ReservaRepository reservaRepository;
    private final OutboxPublisher outboxPublisher;
    private final com.alquilaya.serviciopropiedades.services.HabitacionService habitacionService;

    public SagaReservaPagoService(SagaReservaPagoRepository sagaRepository,
                                  ReservaRepository reservaRepository,
                                  OutboxPublisher outboxPublisher,
                                  com.alquilaya.serviciopropiedades.services.HabitacionService habitacionService) {
        this.sagaRepository = sagaRepository;
        this.reservaRepository = reservaRepository;
        this.outboxPublisher = outboxPublisher;
        this.habitacionService = habitacionService;
    }

    // =====================================================================
    // 1) INICIO de la saga — al APROBAR la reserva
    // =====================================================================

    /**
     * Crea una nueva saga al aprobarse la reserva. Si ya existe una saga activa
     * para esa reserva (caso raro: aprobar dos veces por concurrencia) es no-op.
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public SagaReservaPago iniciarSaga(Long reservaId) {
        Optional<SagaReservaPago> existente = sagaRepository.findActivaByReservaId(reservaId);
        if (existente.isPresent()) {
            log.debug("Saga ya activa para reserva {} (sagaId={}). Skip iniciarSaga.",
                    reservaId, existente.get().getSagaId());
            return existente.get();
        }

        SagaReservaPago saga = SagaReservaPago.builder()
                .sagaId(UUID.randomUUID())
                .reservaId(reservaId)
                .estadoSaga(EstadoSaga.ESPERANDO_PAGO)
                .pasoActual(PasoSaga.PAGO_PENDIENTE)
                .intentos(0)
                .payload(serializarPayload(Map.of(
                        "reservaId", reservaId,
                        "correlationId", String.valueOf(MDC.get("correlationId")))))
                .build();

        SagaReservaPago guardada = sagaRepository.save(saga);
        log.info("Saga {} iniciada para reserva {} (estado=ESPERANDO_PAGO)",
                guardada.getSagaId(), reservaId);
        return guardada;
    }

    // =====================================================================
    // 2) PAGO_EXITOSO recibido
    // =====================================================================

    /**
     * Manejado desde {@code PagoEventListener} tras marcar idempotencia.
     *
     * Reglas:
     * <ul>
     *   <li>Si la saga ya está COMPLETADA/FALLIDA → ignorar.</li>
     *   <li>Si la reserva está APROBADA → transicionar a PAGADA + saga COMPLETADA.</li>
     *   <li>Si la reserva está CANCELADA o RECHAZADA → emitir {@code REFUND_REQUERIDO}
     *       y dejar saga en COMPLETADA tras éxito de la emisión (la emisión va al outbox,
     *       así que es "best effort transaccional"; el scheduler completa si fallara).</li>
     *   <li>Si la reserva ya está PAGADA → no-op (idempotencia de negocio).</li>
     * </ul>
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public void manejarPagoExitoso(Long reservaId, EventEnvelope envelope) {
        Reserva reserva = reservaRepository.findById(reservaId).orElse(null);
        if (reserva == null) {
            log.warn("manejarPagoExitoso: reserva {} no encontrada", reservaId);
            return;
        }

        SagaReservaPago saga = sagaRepository.findActivaByReservaId(reservaId).orElse(null);
        if (saga == null) {
            // No hay saga vigente — recuperar la última o crear una "in-flight" para auditar.
            // Probablemente el listener corrió antes que aprobar() (raro), o esta reserva
            // no tenía saga porque el flujo de aprobación no se realizó (legacy). En cualquier
            // caso, aplicamos la lógica directa sin reabrir una saga ya cerrada.
            log.warn("manejarPagoExitoso: sin saga activa para reserva {}. Estado reserva={}.",
                    reservaId, reserva.getEstado());
            aplicarLogicaDirecta(reserva, envelope);
            return;
        }

        if (saga.getEstadoSaga() == EstadoSaga.COMPLETADA
                || saga.getEstadoSaga() == EstadoSaga.FALLIDA) {
            log.debug("Saga {} ya en estado terminal {}. Skip.", saga.getSagaId(), saga.getEstadoSaga());
            return;
        }

        EstadoReserva estado = reserva.getEstado();
        Long pagoId = extraerPagoIdDelEnvelope(envelope);
        String correlationId = envelope != null && envelope.getCorrelationId() != null
                ? envelope.getCorrelationId()
                : MDC.get("correlationId");

        switch (estado) {
            case APROBADA -> rutaFelizPagado(saga, reserva, envelope);
            case CANCELADA, RECHAZADA, EXPIRADA -> iniciarRefund(saga, reservaId, pagoId,
                    "Pago recibido pero reserva en estado " + estado, correlationId);
            case PAGADA -> {
                log.debug("Reserva {} ya estaba PAGADA. Marcando saga {} COMPLETADA.", reservaId, saga.getSagaId());
                marcarSagaCompletada(saga, PasoSaga.PAGO_CONFIRMADO);
            }
            default -> log.warn("manejarPagoExitoso: estado inesperado {} para reserva {}", estado, reservaId);
        }
    }

    private void rutaFelizPagado(SagaReservaPago saga, Reserva reserva, EventEnvelope envelope) {
        if (reserva.getEstado() != EstadoReserva.APROBADA) {
            log.warn("rutaFelizPagado invocada con reserva en estado {} (esperado APROBADA)",
                    reserva.getEstado());
            return;
        }
        reserva.setEstado(EstadoReserva.PAGADA);
        snapshotComision(reserva, envelope);
        reservaRepository.save(reserva);
        habitacionService.recomputarEstado(reserva.getHabitacionId());
        log.info("Saga {}: reserva {} → PAGADA (ruta feliz)", saga.getSagaId(), reserva.getId());
        marcarSagaCompletada(saga, PasoSaga.PAGO_CONFIRMADO);
    }

    /** Snapshotea en la reserva la comisión efectivamente cobrada que trae el evento de pago. */
    private void snapshotComision(Reserva reserva, EventEnvelope envelope) {
        if (envelope == null || envelope.getPayload() == null) return;
        JsonNode node = envelope.getPayload().get("comision");
        if (node == null || node.isNull()) return;
        try {
            reserva.setComision(node.isNumber()
                    ? node.decimalValue()
                    : new java.math.BigDecimal(node.asText().trim()));
        } catch (Exception e) {
            log.warn("No se pudo leer comision del evento de pago para reserva {}: {}",
                    reserva.getId(), e.getMessage());
        }
    }

    // =====================================================================
    // 3) CANCELACIÓN de reserva con pago en curso o ya pagado
    // =====================================================================

    /**
     * Llamado desde {@link com.alquilaya.serviciopropiedades.services.ReservaService#cancelar}
     * DESPUÉS de persistir la cancelación.
     *
     * Si la saga está ESPERANDO_PAGO y el pago aún no ha llegado, sólo marcamos la saga como
     * COMPLETADA (no hay nada que reembolsar). Si la reserva estaba PAGADA → emitir REFUND.
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public void manejarCancelacionReserva(Long reservaId) {
        SagaReservaPago saga = sagaRepository.findActivaByReservaId(reservaId).orElse(null);
        if (saga == null) {
            log.debug("manejarCancelacionReserva: sin saga activa para reserva {}", reservaId);
            return;
        }
        if (saga.getEstadoSaga() == EstadoSaga.COMPLETADA
                || saga.getEstadoSaga() == EstadoSaga.FALLIDA) {
            log.debug("Saga {} ya terminal {}. Skip.", saga.getSagaId(), saga.getEstadoSaga());
            return;
        }

        Reserva reserva = reservaRepository.findById(reservaId).orElse(null);
        boolean reservaPagada = reserva != null && reserva.getEstado() == EstadoReserva.PAGADA;
        boolean pasoConfirmado = saga.getPasoActual() == PasoSaga.PAGO_CONFIRMADO;

        if (reservaPagada || pasoConfirmado) {
            iniciarRefund(saga, reservaId, null,
                    "Reserva cancelada después de pago confirmado",
                    MDC.get("correlationId"));
        } else {
            log.info("Saga {}: cancelación sin pago previo. Cerrando saga sin refund.", saga.getSagaId());
            marcarSagaCompletada(saga, PasoSaga.FIN);
        }
    }

    // =====================================================================
    // 4) EXPIRACIÓN de reserva — invocada por ReservaExpirationScheduler
    // =====================================================================

    /**
     * Cierra la saga cuando la reserva expira (timeout de 24h sin pago).
     *
     * <p>Por contrato del job de expiración, sólo se expiran reservas en estado
     * {@code APROBADA} (es decir, la saga estaba en {@link EstadoSaga#ESPERANDO_PAGO}
     * con paso {@link PasoSaga#PAGO_PENDIENTE}). Como aún no llegó ningún pago,
     * no hay nada que reembolsar: simplemente marcamos la saga como
     * {@link EstadoSaga#COMPLETADA} con paso {@link PasoSaga#FIN}.
     *
     * <p>Si por concurrencia llegara un pago tarde después de la expiración, el
     * listener verá saga en estado terminal y la nueva ruta enviará a
     * {@link #aplicarLogicaDirecta} que emitirá {@code REFUND_REQUERIDO} (porque la
     * reserva estará en EXPIRADA, tratada como cancelada de facto).
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public void manejarExpiracionReserva(Long reservaId) {
        SagaReservaPago saga = sagaRepository.findActivaByReservaId(reservaId).orElse(null);
        if (saga == null) {
            log.debug("manejarExpiracionReserva: sin saga activa para reserva {}", reservaId);
            return;
        }
        if (saga.getEstadoSaga() == EstadoSaga.COMPLETADA
                || saga.getEstadoSaga() == EstadoSaga.FALLIDA) {
            log.debug("Saga {} ya terminal {}. Skip expiración.",
                    saga.getSagaId(), saga.getEstadoSaga());
            return;
        }
        log.info("Saga {}: reserva {} EXPIRADA antes de pago → cerrando saga COMPLETADA",
                saga.getSagaId(), reservaId);
        marcarSagaCompletada(saga, PasoSaga.FIN);
    }

    // =====================================================================
    // Compensación — emisión de REFUND_REQUERIDO
    // =====================================================================

    /**
     * Pone la saga en estado COMPENSANDO e intenta emitir REFUND_REQUERIDO vía outbox.
     * Si la emisión falla (por error inesperado al serializar / persistir), incrementa
     * intentos y el scheduler reintentará.
     */
    private void iniciarRefund(SagaReservaPago saga, Long reservaId, Long pagoId,
                               String motivo, String correlationId) {
        saga.setEstadoSaga(EstadoSaga.COMPENSANDO);
        saga.setPasoActual(PasoSaga.COMPENSACION_REFUND);
        sagaRepository.save(saga);

        log.warn("Saga {}: iniciando compensación REFUND_REQUERIDO para reserva {} motivo='{}'",
                saga.getSagaId(), reservaId, motivo);

        boolean ok = ejecutarCompensacion(saga, reservaId, pagoId, motivo, correlationId);
        if (ok) {
            marcarSagaCompletada(saga, PasoSaga.FIN);
        }
        // si no ok, queda en COMPENSANDO y el scheduler reintenta
    }

    /**
     * Reintento — invocado por el scheduler. Reusa la misma lógica de emisión.
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public void reintentarCompensacion(UUID sagaId) {
        SagaReservaPago saga = sagaRepository.findById(sagaId).orElse(null);
        if (saga == null) {
            log.warn("reintentarCompensacion: saga {} no existe", sagaId);
            return;
        }
        if (saga.getEstadoSaga() != EstadoSaga.COMPENSANDO) {
            log.debug("reintentarCompensacion: saga {} no está en COMPENSANDO (estado={}).",
                    sagaId, saga.getEstadoSaga());
            return;
        }
        if (saga.getIntentos() >= MAX_INTENTOS) {
            saga.setEstadoSaga(EstadoSaga.FALLIDA);
            saga.setCompletedAt(LocalDateTime.now());
            sagaRepository.save(saga);
            log.error("Saga {} FALLIDA tras {} intentos. Reserva={}, ultimoError='{}'",
                    sagaId, saga.getIntentos(), saga.getReservaId(), saga.getUltimoError());
            return;
        }

        boolean ok = ejecutarCompensacion(saga, saga.getReservaId(), null,
                "Reintento de compensación", MDC.get("correlationId"));
        if (ok) {
            marcarSagaCompletada(saga, PasoSaga.FIN);
        }
    }

    /**
     * Ejecuta la emisión a outbox. Devuelve {@code true} si la emisión fue exitosa;
     * en caso de error registra ultimoError + incrementa intentos y devuelve {@code false}.
     */
    private boolean ejecutarCompensacion(SagaReservaPago saga, Long reservaId, Long pagoId,
                                         String motivo, String correlationId) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("reservaId", reservaId);
            if (pagoId != null) payload.put("pagoId", pagoId);
            payload.put("motivo", motivo != null ? motivo : "");
            payload.put("sagaId", saga.getSagaId().toString());

            outboxPublisher.publicar(
                    TOPIC_PAGOS,
                    EVENT_TYPE_REFUND,
                    "Reserva",
                    String.valueOf(reservaId),
                    payload,
                    correlationId);

            log.info("Saga {}: REFUND_REQUERIDO emitido a outbox (reserva={}, pagoId={})",
                    saga.getSagaId(), reservaId, pagoId);
            return true;
        } catch (Exception e) {
            int prev = saga.getIntentos() != null ? saga.getIntentos() : 0;
            saga.setIntentos(prev + 1);
            saga.setUltimoError(truncar(e.getClass().getSimpleName() + ": " + e.getMessage(), 4000));
            sagaRepository.save(saga);
            log.error("Saga {}: error emitiendo REFUND_REQUERIDO (intentos={}): {}",
                    saga.getSagaId(), saga.getIntentos(), e.getMessage(), e);
            return false;
        }
    }

    // =====================================================================
    // Helpers
    // =====================================================================

    /** Vía sin saga activa: aplica la transición directa equivalente al listener legacy. */
    private void aplicarLogicaDirecta(Reserva reserva, EventEnvelope envelope) {
        EstadoReserva estado = reserva.getEstado();
        if (estado == EstadoReserva.APROBADA) {
            reserva.setEstado(EstadoReserva.PAGADA);
            snapshotComision(reserva, envelope);
            reservaRepository.save(reserva);
            habitacionService.recomputarEstado(reserva.getHabitacionId());
            log.info("Reserva {} → PAGADA (sin saga; fallback)", reserva.getId());
        } else if (estado == EstadoReserva.CANCELADA
                || estado == EstadoReserva.RECHAZADA
                || estado == EstadoReserva.EXPIRADA) {
            // Sin saga vigente, crear una "huérfana" para auditar el refund.
            SagaReservaPago huerfana = SagaReservaPago.builder()
                    .sagaId(UUID.randomUUID())
                    .reservaId(reserva.getId())
                    .estadoSaga(EstadoSaga.COMPENSANDO)
                    .pasoActual(PasoSaga.COMPENSACION_REFUND)
                    .intentos(0)
                    .payload(serializarPayload(Map.of("razon", "saga_huerfana_pago_post_cancel")))
                    .build();
            SagaReservaPago guardada = sagaRepository.save(huerfana);
            Long pagoId = extraerPagoIdDelEnvelope(envelope);
            String correlationId = envelope != null ? envelope.getCorrelationId() : null;
            boolean ok = ejecutarCompensacion(guardada, reserva.getId(), pagoId,
                    "Pago llegó sin saga; reserva en estado " + estado, correlationId);
            if (ok) marcarSagaCompletada(guardada, PasoSaga.FIN);
        } else {
            log.debug("aplicarLogicaDirecta: estado {} no requiere acción", estado);
        }
    }

    private void marcarSagaCompletada(SagaReservaPago saga, PasoSaga pasoFinal) {
        saga.setEstadoSaga(EstadoSaga.COMPLETADA);
        saga.setPasoActual(pasoFinal);
        saga.setCompletedAt(LocalDateTime.now());
        saga.setUltimoError(null);
        sagaRepository.save(saga);
        log.info("Saga {} COMPLETADA (pasoFinal={})", saga.getSagaId(), pasoFinal);
    }

    private Long extraerPagoIdDelEnvelope(EventEnvelope envelope) {
        if (envelope == null || envelope.getPayload() == null) return null;
        JsonNode node = envelope.getPayload().get("pagoId");
        if (node == null || node.isNull()) return null;
        if (node.isNumber()) return node.asLong();
        try {
            return Long.parseLong(node.asText().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String serializarPayload(Object obj) {
        try {
            return MAPPER.writeValueAsString(obj);
        } catch (Exception e) {
            log.warn("No se pudo serializar payload de saga: {}", e.getMessage());
            return "{}";
        }
    }

    private static String truncar(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
