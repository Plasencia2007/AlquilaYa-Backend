package com.alquilaya.serviciopropiedades.scheduler;

import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import com.alquilaya.serviciopropiedades.services.ConfiguracionReservaService;
import com.alquilaya.serviciopropiedades.services.ReservaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Job que avisa al estudiante cuando su reserva APROBADA está cercana a expirar
 * por falta de pago, para reducir reservas perdidas.
 *
 * <p>El umbral es relativo al plazo de expiración vigente (leído de BD, editable
 * desde el panel admin): se recuerda cuando ha transcurrido
 * {@code app.reserva.recordatorio-fraccion} del plazo (default 0.5 = mitad). Al
 * ser una fracción, funciona con cualquier valor de expiración sin riesgo de
 * aritmética negativa.
 *
 * <p>Cada reserva se recuerda una sola vez (flag {@code recordatorioPagoEnviado}).
 * La emisión + marcado se delegan a {@link ReservaService#enviarRecordatorioPago(Long)},
 * cada uno en su propia transacción.
 *
 * <p>Cron por defecto: cada 30 minutos. Configurable vía
 * {@code app.reserva.recordatorio-cron}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReservaRecordatorioScheduler {

    private final ReservaRepository reservaRepository;
    private final ReservaService reservaService;
    private final ConfiguracionReservaService configuracionReservaService;

    @Value("${app.reserva.recordatorio-fraccion:0.5}")
    private double recordatorioFraccion;

    @Scheduled(cron = "${app.reserva.recordatorio-cron:0 */30 * * * *}")
    public void enviarRecordatoriosPago() {
        int expiracionHoras = configuracionReservaService.getExpiracionHoras();
        double fraccion = (recordatorioFraccion > 0 && recordatorioFraccion < 1) ? recordatorioFraccion : 0.5;

        // Corte: reservas cuya aprobación es anterior a (ahora - fraccion*plazo),
        // es decir, que ya consumieron esa fracción del tiempo para pagar.
        long umbralMinutos = Math.round(expiracionHoras * 60.0 * fraccion);
        LocalDateTime corte = LocalDateTime.now().minusMinutes(umbralMinutos);

        List<Reserva> candidatas = reservaRepository.findAprobadasParaRecordatorio(corte);
        if (candidatas.isEmpty()) {
            log.debug("[RECORDATORIO] Sin reservas APROBADA pendientes de recordatorio (corte={})", corte);
            return;
        }

        log.info("[RECORDATORIO] {} reservas candidatas a recordatorio de pago (fraccion={}, corte={})",
                candidatas.size(), fraccion, corte);

        int enviados = 0;
        for (Reserva r : candidatas) {
            Long id = r.getId();
            if (id == null) continue;
            try {
                if (reservaService.enviarRecordatorioPago(id)) {
                    enviados++;
                }
            } catch (Exception e) {
                log.warn("[RECORDATORIO] Falló recordatorio de reserva {}: {}", id, e.getMessage());
            }
        }

        log.info("[RECORDATORIO] Recordatorios enviados={}", enviados);
    }
}
