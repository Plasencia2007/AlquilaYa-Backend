package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.AuditLogDTO;
import com.alquilaya.serviciousuarios.services.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
 * Ítems 364/365: expone en lectura la bitácora de auditoría append-only
 * ({@link AuditLogService}/{@code AuditLog}, G8-A) que hasta ahora sólo se ESCRIBÍA desde
 * los controllers de negocio (p.ej. {@code UsuarioController#actualizarUsuario},
 * {@code DocumentoController#verifyDocumento}) pero no tenía ningún endpoint de lectura.
 *
 * <p>Lo consumen dos pantallas del panel admin:</p>
 * <ul>
 *   <li>{@code system/audit} (365): tabla general, sin filtrar por entidad.</li>
 *   <li>{@code validations/providers} tab Historial (364): mismo endpoint; el frontend
 *       filtra client-side por las acciones que ese módulo ejecuta sobre arrendadores
 *       (verificación de documentos, cambios de estado de cuenta) — {@code AuditLog} no
 *       guarda el rol del usuario afectado, así que un filtro server-side por "solo
 *       arrendadores" no es posible sin un join adicional fuera de alcance aquí.</li>
 * </ul>
 *
 * <p>Ruta bajo {@code /api/v1/usuarios/**}: {@code SecurityConfig} ya exige rol ADMIN para
 * ese prefijo (catch-all {@code hasRole("ADMIN")}); el {@code @PreAuthorize} de método lo
 * refuerza explícitamente, como en el resto de endpoints admin del servicio.</p>
 */
@RestController
@RequestMapping("/api/v1/usuarios/audit")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    /** Página de auditoría, más reciente primero. Todos los filtros son opcionales. */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<AuditLogDTO>> buscar(
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime hasta,
            @PageableDefault(size = 20, sort = "fecha", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(auditLogService.buscar(actor, accion, desde, hasta, pageable).map(AuditLogDTO::from));
    }
}
