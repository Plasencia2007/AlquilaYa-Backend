package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.SecurityEventDTO;
import com.alquilaya.serviciousuarios.services.SecurityEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

/**
 * Ítem 351: panel admin de alertas de seguridad — lee {@code security_events}, el sink que
 * {@code SecurityEventListener} llena desde el topic Kafka {@code user-security-events}.
 *
 * <p>Ruta bajo {@code /api/v1/usuarios/admin/**}: {@code SecurityConfig} ya exige rol ADMIN para
 * ese prefijo (cae en el matcher {@code /api/v1/usuarios/** -> hasRole('ADMIN')}); el
 * {@code @PreAuthorize} de método lo refuerza. No requiere tocar {@code SecurityConfig}.</p>
 */
@RestController
@RequestMapping("/api/v1/usuarios/admin/security-events")
@RequiredArgsConstructor
public class AdminSecurityEventController {

    private final SecurityEventService securityEventService;

    /** Página de eventos de seguridad, más reciente primero. {@code desde} opcional. */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<SecurityEventDTO>> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(securityEventService.listar(desde, pageable));
    }
}
