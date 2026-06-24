package com.alquilaya.serviciopropiedades.scheduler;

import com.alquilaya.serviciopropiedades.entities.Reserva;
import com.alquilaya.serviciopropiedades.enums.EstadoReserva;
import com.alquilaya.serviciopropiedades.kafka.ReservaEventProducer;
import com.alquilaya.serviciopropiedades.repositories.ReservaRepository;
import com.alquilaya.serviciopropiedades.saga.service.SagaReservaPagoService;
import com.alquilaya.serviciopropiedades.services.ConfiguracionReservaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Job de expiración de reservas APROBADAS sin pago.
 *
 * <p>Una reserva APROBADA que no se paga dentro del plazo configurado
 * ({@code app.reserva.expiracion-horas}, default 24h) se transiciona a
 * estado terminal {@link EstadoReserva#EXPIRADA}. Esto libera el slot
 * automáticamente porque EXPIRADA no está en el conjunto de
 * {@code ESTADOS_BLOQUEANTES} del servicio (SOLICITADA, APROBADA, PAGADA),
 * por lo que la verificación de solapamiento de fechas vuelve a admitir
 * nuevas reservas sobre la misma propiedad/rango.
 *
 * <p>El evento {@code RESERVA_EXPIRADA} se emite vía Outbox dentro de la
 * misma transacción que muta el estado, garantizando atomicidad
 * (state-machine + evento o nada).
 *
 * <p>Cron por defecto: cada hora en el minuto 0
 * ({@code 0 0 *&#47;1 * * *}). Configurable vía propiedad
 * {@code app.reserva.expiracion-cron}.
 *
 * <p>La mutación se delega a {@link ReservaExpirationService} para que el
 * proxy {@code @Transactional} de Spring se aplique correctamente (la
 * auto-invocación dentro del mismo bean bypassaría el proxy).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReservaExpirationScheduler {

    private final ReservaRepository reservaRepository;
    private final ReservaExpirationService reservaExpirationService;
    private final ConfiguracionReservaService configuracionReservaService;

    /**
     * Cada hora en punto. Para entornos de bajo tráfico se puede relajar a
     * {@code 0 0 *&#47;6 * * *} (cada 6h) vía la propiedad de configuración.
     */
    @Scheduled(cron = "${app.reserva.expiracion-cron:0 0 */1 * * *}")
    public void expirarReservasAprobadas() {
        // Plazo leído de BD en cada ejecución: un cambio desde el panel admin
        // aplica sin reiniciar el servicio.
        long horas = configuracionReservaService.getExpiracionHoras();
        LocalDateTime corte = LocalDateTime.now().minusHours(horas);

        List<Reserva> candidatas = reservaRepository.findReservasAprobadasParaExpirar(corte);
        if (candidatas.isEmpty()) {
            log.debug("[EXPIRACION] No hay reservas APROBADAS para expirar (corte={}h)", horas);
            return;
        }

        log.info("[EXPIRACION] {} reservas APROBADAS sin pago candidatas a EXPIRAR (corte={}h, < {})",
                candidatas.size(), horas, corte);

        List<Long> expiradas = new ArrayList<>(candidatas.size());
        List<Long> fallidas = new ArrayList<>();

        for (Reserva r : candidatas) {
            Long id = r.getId();
            if (id == null) continue;
            try {
                Long expiradaId = reservaExpirationService.expirarUna(id, horas);
                if (expiradaId != null) {
                    expiradas.add(expiradaId);
                }
            } catch (Exception e) {
                fallidas.add(id);
                log.warn("[EXPIRACION] Falló expiración de reserva {}: {}", id, e.getMessage());
            }
        }

        log.info("[EXPIRACION] Expiradas={} reservaIds={} fallidas={}", expiradas.size(), expiradas, fallidas);
    }

    /**
     * Componente transaccional separado: una TX por reserva, así un fallo
     * aislado no aborta todo el batch.
     */
    @Slf4j
    @Component
    @RequiredArgsConstructor
    public static class ReservaExpirationService {

        private static final String EVENT_TYPE_EXPIRADA = "RESERVA_EXPIRADA";

        private final ReservaRepository reservaRepository;
        private final ReservaEventProducer reservaEventProducer;
        private final SagaReservaPagoService sagaReservaPagoService;
        private final com.alquilaya.serviciopropiedades.services.HabitacionService habitacionService;

        /**
         * Expira una sola reserva en su propia transacción. Re-lee la entidad
         * dentro de la TX para evitar conflictos con eventos {@code PAGO_EXITOSO}
         * que pudieran haber llegado entre el query del batch y este punto.
         *
         * @return el id de la reserva expirada, o {@code null} si ya no aplica.
         */
        @Transactional
        public Long expirarUna(Long reservaId, long expiracionHoras) {
            Optional<Reserva> opt = reservaRepository.findById(reservaId);
            if (opt.isEmpty()) {
                log.debug("[EXPIRACION] Reserva {} ya no existe, se omite", reservaId);
                return null;
            }
            Reserva r = opt.get();
            if (r.getEstado() != EstadoReserva.APROBADA) {
                log.debug("[EXPIRACION] Reserva {} ya no está APROBADA (estado={}), se omite",
                        reservaId, r.getEstado());
                return null;
            }
            if (!r.getEstado().puedeTransicionarA(EstadoReserva.EXPIRADA)) {
                log.warn("[EXPIRACION] Transición no permitida {} -> EXPIRADA para reserva {}",
                        r.getEstado(), reservaId);
                return null;
            }

            r.setEstado(EstadoReserva.EXPIRADA);
            Reserva guardada = reservaRepository.save(r);
            habitacionService.recomputarTrasCambioReserva(guardada);

            // Evento via Outbox: misma TX que el cambio de estado.
            Map<String, Object> extra = new HashMap<>();
            extra.put("propiedadId", guardada.getPropiedadId());
            extra.put("estudianteId", guardada.getEstudianteId());
            extra.put("arrendadorId", guardada.getArrendadorId());
            extra.put("estado", guardada.getEstado().name());
            extra.put("montoTotal", guardada.getMontoTotal());
            extra.put("motivo", "TIMEOUT_PAGO");
            extra.put("expiracionHoras", expiracionHoras);
            reservaEventProducer.emitir(EVENT_TYPE_EXPIRADA, guardada.getId(), extra);

            // Cerrar saga asociada (si existe) en la misma TX. Evita que la saga
            // quede colgada en ESPERANDO_PAGO indefinidamente.
            try {
                sagaReservaPagoService.manejarExpiracionReserva(guardada.getId());
            } catch (Exception e) {
                // El cierre de saga es best-effort; la expiración de la reserva ya
                // está persistida y el evento ya está en outbox. Loguear y seguir.
                log.warn("[EXPIRACION] No se pudo cerrar saga de reserva {}: {}",
                        guardada.getId(), e.getMessage());
            }

            log.info("[EXPIRACION] Reserva {} EXPIRADA (propiedad={}, estudiante={})",
                    guardada.getId(), guardada.getPropiedadId(), guardada.getEstudianteId());
            return guardada.getId();
        }
    }
}
