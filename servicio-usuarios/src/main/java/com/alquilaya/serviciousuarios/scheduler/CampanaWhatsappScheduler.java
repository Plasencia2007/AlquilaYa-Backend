package com.alquilaya.serviciousuarios.scheduler;

import com.alquilaya.serviciousuarios.entities.CampanaWhatsapp;
import com.alquilaya.serviciousuarios.enums.EstadoEnvioCampana;
import com.alquilaya.serviciousuarios.repositories.CampanaWhatsappRepository;
import com.alquilaya.serviciousuarios.services.CampanaWhatsappService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Recoge campañas de WhatsApp programadas (ítem 381, "programación opcional") cuya fecha ya se
 * cumplió y las envía. Deliberadamente más simple que {@code EnvioAlertaScheduler}: no hay
 * reintentos por-destinatario aquí porque {@link CampanaWhatsappService#enviarAhora} solo
 * ENCOLA en la outbox transaccional — la entrega confiable a Kafka ya la resuelve el
 * {@code OutboxScheduler} existente, igual que para cualquier otro evento del servicio.
 *
 * <p>Asume una sola instancia del servicio corriendo (no usa {@code FOR UPDATE SKIP LOCKED});
 * aceptable a la escala de campañas admin (baja frecuencia, no una cola de alto volumen).</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CampanaWhatsappScheduler {

    private final CampanaWhatsappRepository campanaRepository;
    private final CampanaWhatsappService campanaWhatsappService;

    @Scheduled(fixedDelay = 60_000L)
    public void enviarProgramadas() {
        List<CampanaWhatsapp> vencidas = campanaRepository
                .findByEstadoEnvioAndProgramadoParaLessThanEqualOrderByProgramadoParaAsc(
                        EstadoEnvioCampana.PENDIENTE, LocalDateTime.now());
        if (vencidas.isEmpty()) return;

        log.info("[CampanaWhatsapp] {} campaña(s) programada(s) vencida(s), enviando…", vencidas.size());
        for (CampanaWhatsapp campana : vencidas) {
            campanaWhatsappService.enviarAhora(campana);
        }
    }
}
