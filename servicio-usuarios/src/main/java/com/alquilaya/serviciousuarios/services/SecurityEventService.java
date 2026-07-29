package com.alquilaya.serviciousuarios.services;

import com.alquilaya.serviciousuarios.dto.SecurityEventDTO;
import com.alquilaya.serviciousuarios.entities.SecurityEvent;
import com.alquilaya.serviciousuarios.repositories.SecurityEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Ítem 351: persistencia y lectura de {@code security_events} — el sink de las alertas de
 * seguridad publicadas a Kafka (topic {@code user-security-events}).
 */
@Service
@RequiredArgsConstructor
public class SecurityEventService {

    private final SecurityEventRepository repository;

    /** Llamado por {@code SecurityEventListener} dentro de su {@code @Transactional}. */
    @Transactional
    public void registrar(String tipo, Long usuarioId, String detalle) {
        repository.save(SecurityEvent.builder()
                .tipo(tipo)
                .usuarioId(usuarioId)
                .detalle(detalle)
                .fecha(LocalDateTime.now())
                .build());
    }

    /** Página de eventos para el panel admin, más reciente primero. */
    @Transactional(readOnly = true)
    public Page<SecurityEventDTO> listar(LocalDateTime desde, Pageable pageable) {
        return repository.buscar(desde, pageable).map(SecurityEventService::toDTO);
    }

    private static SecurityEventDTO toDTO(SecurityEvent e) {
        return new SecurityEventDTO(e.getId(), e.getTipo(), e.getUsuarioId(), e.getDetalle(), e.getFecha());
    }
}
