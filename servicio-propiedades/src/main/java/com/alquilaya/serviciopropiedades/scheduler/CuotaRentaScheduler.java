package com.alquilaya.serviciopropiedades.scheduler;

import com.alquilaya.serviciopropiedades.entities.CuotaRenta;
import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.services.CuotaRentaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * G2 — Job del cronograma de renta mensual recurrente. En cada corrida:
 * <ol>
 *   <li>Genera (idempotente) el cronograma de cuotas de las reservas activas (PAGADA
 *       multi-mes).</li>
 *   <li>Marca VENCIDA toda cuota PENDIENTE cuyo vencimiento ya pasó.</li>
 *   <li>Emite un recordatorio "cuota por vencer" (vía Outbox → {@code reserva-events})
 *       por cada cuota PENDIENTE que vence dentro de N días y aún sin recordatorio,
 *       marcándola para no repetir.</li>
 * </ol>
 *
 * <p>NO cobra nada: servicio-notificaciones consume el evento para avisar; el cobro
 * real de la cuota es de servicio-pagos (follow-up).
 *
 * <p>Cada reserva/cuota se procesa en su propia transacción (métodos del service):
 * un fallo aislado no aborta el resto del lote.
 *
 * <p>Configurable: cron ({@code app.renta.cuotas.cron}, default diario 01:00),
 * toggle ({@code app.renta.cuotas.enabled}, default true) y ventana de aviso
 * ({@code app.renta.cuotas.recordatorio-dias-antes}, default 3 — #294).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CuotaRentaScheduler {

    private final CuotaRentaService cuotaRentaService;

    @Value("${app.renta.cuotas.enabled:true}")
    private boolean enabled;

    @Value("${app.renta.cuotas.recordatorio-dias-antes:3}")
    private int recordatorioDiasAntes;

    @Scheduled(cron = "${app.renta.cuotas.cron:0 0 1 * * *}")
    public void procesarCuotasRenta() {
        if (!enabled) {
            log.debug("[CUOTAS] Scheduler deshabilitado (app.renta.cuotas.enabled=false)");
            return;
        }

        LocalDate hoy = LocalDate.now();

        // 1) Generar cronograma para reservas activas (idempotente por reserva).
        int generadas = 0;
        List<Reserva> activas = cuotaRentaService.reservasActivas();
        for (Reserva r : activas) {
            if (r.getId() == null) continue;
            try {
                generadas += cuotaRentaService.generarCuotas(r.getId());
            } catch (Exception e) {
                log.warn("[CUOTAS] Falló generación de cuotas para reserva {}: {}", r.getId(), e.getMessage());
            }
        }

        // 2) Marcar vencidas (antes de seleccionar recordatorios: una cuota ya vencida
        //    deja de ser PENDIENTE y no se le enviará recordatorio).
        int vencidas;
        try {
            vencidas = cuotaRentaService.marcarVencidas(hoy);
        } catch (Exception e) {
            vencidas = 0;
            log.warn("[CUOTAS] Falló marcado de cuotas vencidas: {}", e.getMessage());
        }

        // 3) Recordatorios de cuotas por vencer dentro de la ventana.
        int dias = recordatorioDiasAntes >= 0 ? recordatorioDiasAntes : 3;
        LocalDate limite = hoy.plusDays(dias);
        int recordatorios = 0;
        List<CuotaRenta> porVencer = cuotaRentaService.cuotasPorRecordar(limite);
        for (CuotaRenta c : porVencer) {
            if (c.getId() == null) continue;
            try {
                if (cuotaRentaService.emitirRecordatorio(c.getId())) {
                    recordatorios++;
                }
            } catch (Exception e) {
                log.warn("[CUOTAS] Falló recordatorio de cuota {}: {}", c.getId(), e.getMessage());
            }
        }

        if (generadas > 0 || vencidas > 0 || recordatorios > 0) {
            log.info("[CUOTAS] Ciclo renta: cuotas generadas={}, vencidas={}, recordatorios emitidos={} (ventana={}d, hoy={})",
                    generadas, vencidas, recordatorios, dias, hoy);
        } else {
            log.debug("[CUOTAS] Ciclo renta sin cambios (reservas activas={}, hoy={})", activas.size(), hoy);
        }
    }
}
