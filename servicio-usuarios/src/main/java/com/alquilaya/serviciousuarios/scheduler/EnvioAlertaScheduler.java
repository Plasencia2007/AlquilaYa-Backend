package com.alquilaya.serviciousuarios.scheduler;

import com.alquilaya.serviciousuarios.entities.EnvioAlerta;
import com.alquilaya.serviciousuarios.enums.EstadoEnvioAlerta;
import com.alquilaya.serviciousuarios.repositories.EnvioAlertaRepository;
import com.alquilaya.serviciousuarios.services.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Drena periódicamente la cola {@code envios_alerta} enviando los correos de alerta de nuevas
 * propiedades. Es el equivalente de {@code OutboxScheduler} para el ENVÍO por suscripción:
 * misma política de batch con {@code FOR UPDATE SKIP LOCKED}, reintentos con backoff y estado
 * terminal (DLQ) al agotarlos.
 *
 * <p>Política:
 * <ul>
 *   <li>Cada 15s lee hasta {@value #BATCH_SIZE} filas PENDIENTES cuyo {@code proximo_intento <= now}.</li>
 *   <li>Envía con {@link EmailService#enviarAlertaNuevaPropiedadSync} — método SÍNCRONO que
 *       LANZA si el SMTP falla. Sólo se marca {@code ENVIADO} cuando ese método retorna sin
 *       excepción, es decir cuando el correo se envió DE VERDAD (no al encolarlo, ni con el
 *       fallback del circuit-breaker que se traga el error en la variante async).</li>
 *   <li>En fallo incrementa {@code intentos} y reprograma {@code proximo_intento} con backoff
 *       exponencial. Tras {@value #MAX_ATTEMPTS} intentos pasa a {@code FALLIDO} (DLQ lógico) y
 *       loguea a nivel ERROR para revisión.</li>
 *   <li>Un fallo de una fila NO frena el resto del lote (se captura por fila).</li>
 * </ul>
 *
 * <h3>Recuperación de "varados"</h3>
 * <p>No hay estado intermedio "EN_PROCESO": una fila permanece {@code PENDIENTE} (con su
 * {@code proximo_intento} avanzando) hasta que se envía ({@code ENVIADO}) o agota reintentos
 * ({@code FALLIDO}). Si el proceso cae a mitad de un envío, la fila sigue PENDIENTE y el
 * siguiente ciclo la reintenta — semántica at-least-once idéntica a la del outbox.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EnvioAlertaScheduler {

    private static final int  BATCH_SIZE           = 20;
    private static final int  MAX_ATTEMPTS         = 5;
    private static final long BACKOFF_BASE_SECONDS = 60L;   // 1er reintento a +60s
    private static final long BACKOFF_MAX_SECONDS  = 3_600L; // tope de 1h entre reintentos

    private final EnvioAlertaRepository repository;
    private final EmailService emailService;

    @Scheduled(fixedDelay = 15_000L)
    @Transactional
    public void drenar() {
        List<EnvioAlerta> pendientes =
                repository.findPendientesParaEnviar(LocalDateTime.now(), BATCH_SIZE);
        if (pendientes.isEmpty()) return;

        for (EnvioAlerta e : pendientes) {
            try {
                // Envío SÍNCRONO y que LANZA en fallo → sólo marcamos ENVIADO si retorna bien.
                emailService.enviarAlertaNuevaPropiedadSync(
                        e.getCorreo(), e.getTitulo(), e.getPrecio(),
                        e.getUbicacion(), e.getTipoPropiedad(), e.getPropiedadId(), e.getTokenBaja());
                e.setEstado(EstadoEnvioAlerta.ENVIADO);
                e.setEnviadoAt(LocalDateTime.now());
                e.setUltimoError(null);
                repository.save(e);
            } catch (Exception ex) {
                registrarFallo(e, ex);
                repository.save(e);
            }
        }
    }

    private void registrarFallo(EnvioAlerta e, Exception ex) {
        int intentos = (e.getIntentos() == null ? 0 : e.getIntentos()) + 1;
        e.setIntentos(intentos);
        e.setUltimoError(truncar(ex.getMessage(), 4000));
        if (intentos >= MAX_ATTEMPTS) {
            e.setEstado(EstadoEnvioAlerta.FALLIDO);
            log.error("[Alerta] Envío a {} (propiedad {}) agotó {} intentos → FALLIDO (DLQ). Último error: {}",
                    e.getCorreo(), e.getPropiedadId(), intentos, ex.getMessage());
        } else {
            long backoff = backoffSeconds(intentos);
            e.setProximoIntento(LocalDateTime.now().plusSeconds(backoff));
            log.warn("[Alerta] Envío a {} (propiedad {}) falló (intento {}/{}); reintento en {}s. Error: {}",
                    e.getCorreo(), e.getPropiedadId(), intentos, MAX_ATTEMPTS, backoff, ex.getMessage());
        }
    }

    /** Backoff exponencial acotado: 60s, 120s, 240s, 480s... con tope de 1h. */
    private static long backoffSeconds(int intentos) {
        long secs = BACKOFF_BASE_SECONDS * (1L << Math.min(intentos - 1, 6));
        return Math.min(secs, BACKOFF_MAX_SECONDS);
    }

    private static String truncar(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
