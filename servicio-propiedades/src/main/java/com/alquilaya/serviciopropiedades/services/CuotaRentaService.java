package com.alquilaya.serviciopropiedades.services;

import com.alquilaya.serviciopropiedades.config.CurrentUser;
import com.alquilaya.serviciopropiedades.entities.CuotaRenta;
import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoCuota;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.outbox.publisher.OutboxPublisher;
import com.alquilaya.serviciopropiedades.repositories.CuotaRentaRepository;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * G2 — Renta mensual recurrente (FUNDACIÓN: cronograma + recordatorios).
 *
 * <p>Genera y mantiene el cronograma de {@link CuotaRenta} de una reserva que
 * representa un arrendamiento recurrente y emite recordatorios de "cuota por
 * vencer" vía Outbox → {@code reserva-events}. NO cobra: el cobro real de cada
 * cuota es de servicio-pagos (follow-up). Es 100% aditivo: no toca el flujo de
 * pago único existente ({@code Reserva.montoTotal}).
 *
 * <p><b>Trigger de elegibilidad</b> — La reserva NO lleva un flag explícito de
 * "mensual recurrente" ({@code Propiedad.periodoAlquiler} es un String libre y el
 * monto ya se calcula como precio×meses). Por eso se usa la señal más fuerte
 * disponible: reserva {@code PAGADA} (pago inicial hecho, arrendamiento activo) y
 * <b>duración multi-mes</b> ({@code meses >= 2}). Los meses se derivan igual que
 * {@code ReservaService.calcularMonto}: {@code round((dias+1)/30)}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CuotaRentaService {

    private static final DateTimeFormatter FMT_PERIODO = DateTimeFormatter.ofPattern("yyyy-MM");

    /** Reutiliza el topic de reservas; el eventType es nuevo y auto-descriptivo. */
    private static final String TOPIC = "reserva-events";
    private static final String EVENT_TYPE = "CUOTA_RENTA_POR_VENCER";
    private static final String AGGREGATE_TYPE = "CuotaRenta";

    private final CuotaRentaRepository cuotaRentaRepository;
    private final ReservaRepository reservaRepository;
    private final ReservaService reservaService;
    private final OutboxPublisher outboxPublisher;

    /**
     * (Re)genera el cronograma de cuotas de la reserva indicada. Idempotente: no
     * duplica cuotas existentes (clave natural {@code reservaId + numeroCuota}).
     *
     * @return número de cuotas nuevas creadas (0 si no es elegible o ya existían).
     */
    @Transactional
    public int generarCuotas(Long reservaId) {
        Reserva reserva = reservaRepository.findById(reservaId)
                .orElseThrow(() -> new IllegalArgumentException("No existe la reserva " + reservaId));
        return generarCuotas(reserva);
    }

    @Transactional
    public int generarCuotas(Reserva reserva) {
        if (reserva == null || reserva.getId() == null) {
            return 0;
        }
        int meses = mesesDeArrendamiento(reserva);
        if (!esArrendamientoRecurrente(reserva, meses)) {
            log.debug("[CUOTAS] Reserva {} no elegible para cuotas (estado={}, meses={})",
                    reserva.getId(), reserva.getEstado(), meses);
            return 0;
        }

        BigDecimal total = reserva.getMontoTotal() != null
                ? reserva.getMontoTotal()
                : BigDecimal.ZERO;
        // Prorrateo mensual del total del arrendamiento. La última cuota absorbe el
        // redondeo para que la suma de cuotas == montoTotal exactamente.
        BigDecimal cuotaBase = total.divide(BigDecimal.valueOf(meses), 2, RoundingMode.HALF_UP);
        BigDecimal sumaPrevias = cuotaBase.multiply(BigDecimal.valueOf(meses - 1L));
        LocalDate inicio = reserva.getFechaInicio();

        int creadas = 0;
        for (int n = 1; n <= meses; n++) {
            if (cuotaRentaRepository.existsByReservaIdAndNumeroCuota(reserva.getId(), n)) {
                continue; // idempotente
            }
            BigDecimal monto = (n < meses) ? cuotaBase : total.subtract(sumaPrevias);
            LocalDate periodoFecha = inicio.plusMonths(n - 1L);
            CuotaRenta cuota = CuotaRenta.builder()
                    .reservaId(reserva.getId())
                    .numeroCuota(n)
                    .periodo(periodoFecha.format(FMT_PERIODO))
                    .monto(monto.setScale(2, RoundingMode.HALF_UP))
                    .estado(EstadoCuota.PENDIENTE)
                    .fechaVencimiento(periodoFecha)
                    .recordatorioEnviado(false)
                    .build();
            cuotaRentaRepository.save(cuota);
            creadas++;
        }

        if (creadas > 0) {
            log.info("[CUOTAS] Generadas {} cuota(s) de renta para reserva {} (meses={}, total={})",
                    creadas, reserva.getId(), meses, total);
        }
        return creadas;
    }

    /** Reservas activas (PAGADA) candidatas a tener cronograma de renta. */
    @Transactional(readOnly = true)
    public List<Reserva> reservasActivas() {
        return reservaRepository.findByEstado(EstadoReserva.PAGADA);
    }

    /** Marca VENCIDA toda cuota PENDIENTE cuyo vencimiento ya pasó. Bulk, idempotente. */
    @Transactional
    public int marcarVencidas(LocalDate hoy) {
        return cuotaRentaRepository.marcarVencidas(hoy);
    }

    /** Cuotas PENDIENTE por vencer (hasta {@code limite}) aún sin recordatorio. */
    @Transactional(readOnly = true)
    public List<CuotaRenta> cuotasPorRecordar(LocalDate limite) {
        return cuotaRentaRepository
                .findByEstadoAndRecordatorioEnviadoFalseAndFechaVencimientoLessThanEqual(
                        EstadoCuota.PENDIENTE, limite);
    }

    /**
     * Emite el recordatorio "cuota por vencer" vía Outbox y marca la cuota.
     * Idempotente: si la cuota ya no está PENDIENTE o ya se recordó, no hace nada.
     * Acción del sistema (scheduler, sin request context): emite sin enriquecimiento
     * Feign; el consumidor de notificaciones solo necesita los ids del payload.
     *
     * @return true si se emitió el recordatorio.
     */
    @Transactional
    public boolean emitirRecordatorio(Long cuotaId) {
        CuotaRenta c = cuotaRentaRepository.findById(cuotaId).orElse(null);
        if (c == null || c.getEstado() != EstadoCuota.PENDIENTE) {
            return false;
        }
        if (Boolean.TRUE.equals(c.getRecordatorioEnviado())) {
            return false;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("cuotaId", c.getId());
        payload.put("reservaId", c.getReservaId());
        payload.put("numeroCuota", c.getNumeroCuota());
        payload.put("periodo", c.getPeriodo());
        payload.put("monto", c.getMonto());
        payload.put("fechaVencimiento", c.getFechaVencimiento() != null ? c.getFechaVencimiento().toString() : null);
        payload.put("estado", c.getEstado().name());
        reservaRepository.findById(c.getReservaId()).ifPresent(r -> {
            payload.put("propiedadId", r.getPropiedadId());
            payload.put("estudianteId", r.getEstudianteId());
            payload.put("arrendadorId", r.getArrendadorId());
        });

        outboxPublisher.publicar(TOPIC, EVENT_TYPE, AGGREGATE_TYPE,
                String.valueOf(c.getId()), payload, MDC.get("correlationId"));

        c.setRecordatorioEnviado(true);
        cuotaRentaRepository.save(c);
        log.info("[CUOTAS] Recordatorio {} emitido para cuota {} (reserva {}, periodo {}, vence {})",
                EVENT_TYPE, c.getId(), c.getReservaId(), c.getPeriodo(), c.getFechaVencimiento());
        return true;
    }

    /**
     * Lista el cronograma de una reserva. Anti-IDOR: reutiliza la validación de
     * participante/ADMIN de {@link ReservaService#obtenerPropia} (misma guarda que
     * GET /reservas/{id}). Lanza si el solicitante no es dueño ni admin.
     */
    @Transactional(readOnly = true)
    public List<CuotaRenta> listarPorReserva(Long reservaId, CurrentUser current) {
        reservaService.obtenerPropia(reservaId, current);
        return cuotaRentaRepository.findByReservaIdOrderByNumeroCuotaAsc(reservaId);
    }

    // ===== Helpers =====

    private boolean esArrendamientoRecurrente(Reserva r, int meses) {
        return r.getEstado() == EstadoReserva.PAGADA
                && r.getFechaInicio() != null
                && r.getFechaFin() != null
                && meses >= 2;
    }

    /**
     * Meses del arrendamiento, misma fórmula que {@code ReservaService.calcularMonto}
     * ({@code montoTotal = precio × meses}), para que el prorrateo cuadre con el total.
     */
    private int mesesDeArrendamiento(Reserva r) {
        if (r.getFechaInicio() == null || r.getFechaFin() == null) {
            return 0;
        }
        long dias = ChronoUnit.DAYS.between(r.getFechaInicio(), r.getFechaFin()) + 1;
        return (int) Math.max(1, Math.round(dias / 30.0));
    }
}
