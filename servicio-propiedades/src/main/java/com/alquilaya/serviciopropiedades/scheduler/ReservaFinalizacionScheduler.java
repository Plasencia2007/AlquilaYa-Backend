package com.alquilaya.serviciopropiedades.scheduler;

import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import com.alquilaya.serviciopropiedades.services.ReservaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Job que cierra automáticamente reservas PAGADA cuya estadía ya terminó
 * (fechaFin anterior a hoy), transicionándolas a FINALIZADA.
 *
 * <p>Esto desbloquea las reseñas del estudiante (solo permitidas en estado
 * FINALIZADA) sin depender de que el arrendador finalice manualmente, evitando
 * que una reserva quede atrapada en PAGADA indefinidamente.
 *
 * <p>La mutación + emisión de evento (vía Outbox) se delega a
 * {@link ReservaService#finalizarVencida(Long)}, que corre en su propia
 * transacción: un fallo aislado no aborta el resto del batch.
 *
 * <p>Cron por defecto: diario a las 00:30. Configurable vía
 * {@code app.reserva.finalizacion-cron}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReservaFinalizacionScheduler {

    private final ReservaRepository reservaRepository;
    private final ReservaService reservaService;

    @Scheduled(cron = "${app.reserva.finalizacion-cron:0 30 0 * * *}")
    public void finalizarReservasVencidas() {
        LocalDate hoy = LocalDate.now();
        List<Reserva> candidatas = reservaRepository.findPagadasParaFinalizar(hoy);
        if (candidatas.isEmpty()) {
            log.debug("[FINALIZACION] No hay reservas PAGADA con estadía vencida (hoy={})", hoy);
            return;
        }

        log.info("[FINALIZACION] {} reservas PAGADA con estadía vencida candidatas a FINALIZAR (fechaFin < {})",
                candidatas.size(), hoy);

        List<Long> finalizadas = new ArrayList<>();
        List<Long> fallidas = new ArrayList<>();

        for (Reserva r : candidatas) {
            Long id = r.getId();
            if (id == null) continue;
            try {
                if (reservaService.finalizarVencida(id)) {
                    finalizadas.add(id);
                }
            } catch (Exception e) {
                fallidas.add(id);
                log.warn("[FINALIZACION] Falló finalización de reserva {}: {}", id, e.getMessage());
            }
        }

        log.info("[FINALIZACION] Finalizadas={} reservaIds={} fallidas={}",
                finalizadas.size(), finalizadas, fallidas);
    }
}
