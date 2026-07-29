package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.EnvioAlertaFallidaDTO;
import com.alquilaya.serviciousuarios.entities.EnvioAlerta;
import com.alquilaya.serviciousuarios.enums.EstadoEnvioAlerta;
import com.alquilaya.serviciousuarios.exceptions.ConflictoEstadoException;
import com.alquilaya.serviciousuarios.exceptions.RecursoNoEncontradoException;
import com.alquilaya.serviciousuarios.repositories.EnvioAlertaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Operaciones administrativas sobre la cola de alertas por correo ({@code envios_alerta}).
 *
 * <p>Da visibilidad y control sobre el DLQ lógico: las filas que agotaron los reintentos y
 * quedaron en {@link EstadoEnvioAlerta#FALLIDO} (ver {@code EnvioAlertaScheduler}). Sólo se
 * exponen como DTO ({@link EnvioAlertaFallidaDTO}); nunca la entidad cruda.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAlertaService {

    private final EnvioAlertaRepository repository;

    /** Página de alertas en estado FALLIDO (DLQ lógico) para inspección admin. */
    @Transactional(readOnly = true)
    public Page<EnvioAlertaFallidaDTO> listarFallidas(Pageable pageable) {
        return repository.findByEstado(EstadoEnvioAlerta.FALLIDO, pageable)
                .map(EnvioAlertaFallidaDTO::from);
    }

    /**
     * Repone una alerta FALLIDA a la cola: {@code estado=PENDIENTE}, {@code intentos=0},
     * {@code proximoIntento=now}, para que el scheduler la reintente en el próximo ciclo.
     *
     * <p>Semántica REST estricta sobre el estado del recurso:</p>
     * <ul>
     *   <li>Si la fila no existe → {@link RecursoNoEncontradoException} (404): recurso inexistente.</li>
     *   <li>Si existe pero NO está en {@code FALLIDO} (ya {@code ENVIADO} o {@code PENDIENTE}) →
     *       {@link ConflictoEstadoException} (409): la operación no aplica al estado actual. Así,
     *       un doble click o un reintento concurrente no reencolan ni reenvían un correo ya
     *       entregado, y el cliente recibe una señal explícita en vez de un no-op silencioso.</li>
     *   <li>Si está en {@code FALLIDO} → se repone a {@code PENDIENTE} y retorna normalmente.</li>
     * </ul>
     */
    @Transactional
    public void reintentar(Long id) {
        EnvioAlerta e = repository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No se encontró la alerta con ID " + id));

        if (e.getEstado() != EstadoEnvioAlerta.FALLIDO) {
            log.info("[Alerta][Admin] Reintento en conflicto: alerta {} no está en FALLIDO (estado actual: {}).",
                    id, e.getEstado());
            throw new ConflictoEstadoException(
                    "La alerta no está en estado FALLIDO; su estado actual es " + e.getEstado()
                            + ". Solo se pueden reintentar alertas en estado FALLIDO.");
        }

        e.setEstado(EstadoEnvioAlerta.PENDIENTE);
        e.setIntentos(0);
        e.setProximoIntento(LocalDateTime.now());
        e.setUltimoError(null);
        repository.save(e);
        log.warn("[Alerta][Admin] Alerta {} (propiedad {}, correo {}) repuesta a PENDIENTE por un admin.",
                id, e.getPropiedadId(), e.getCorreo());
    }
}
