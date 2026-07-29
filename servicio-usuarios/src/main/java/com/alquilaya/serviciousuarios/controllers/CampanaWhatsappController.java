package com.alquilaya.serviciousuarios.controllers;

import com.alquilaya.serviciousuarios.dto.CampanaWhatsappDTO;
import com.alquilaya.serviciousuarios.dto.CrearCampanaWhatsappRequest;
import com.alquilaya.serviciousuarios.enums.EstadoUsuario;
import com.alquilaya.serviciousuarios.services.AuditLogService;
import com.alquilaya.serviciousuarios.services.CampanaWhatsappService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Campañas de WhatsApp a estudiantes segmentados por carrera/estado de cuenta (ítem 381).
 * Restringido a ADMIN estricto (no un permiso granular): es un envío masivo con costo/riesgo de
 * spam, mismo criterio que otras acciones sensibles del panel (ver "Economía y pagos" en
 * AdminSidebar del frontend).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/usuarios/admin/campanas")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class CampanaWhatsappController {

    private final CampanaWhatsappService campanaWhatsappService;
    private final AuditLogService auditLogService;

    /** Conteo estimado de destinatarios — preview del formulario ANTES de confirmar el envío. */
    @GetMapping("/estudiantes/conteo")
    public ResponseEntity<Map<String, Long>> conteo(
            @RequestParam(required = false) String carrera,
            @RequestParam(required = false) String estado) {
        long total = campanaWhatsappService.contarDestinatarios(carrera, parseEstado(estado));
        return ResponseEntity.ok(Map.of("total", total));
    }

    /** Carreras con al menos un estudiante, para el <select> de segmento del formulario. */
    @GetMapping("/estudiantes/carreras")
    public ResponseEntity<List<String>> carreras() {
        return ResponseEntity.ok(campanaWhatsappService.carrerasDisponibles());
    }

    @PostMapping("/whatsapp")
    public ResponseEntity<CampanaWhatsappDTO> crear(
            @Valid @RequestBody CrearCampanaWhatsappRequest req,
            HttpServletRequest httpReq) {
        CampanaWhatsappDTO creada = campanaWhatsappService.crear(
                req.carrera(), parseEstado(req.estado()), req.mensaje(), req.programadoPara());
        auditLogService.registrarActorActual(
                "CAMPANA_WHATSAPP_CREADA", "CampanaWhatsapp", creada.id(),
                "carrera=" + req.carrera() + " estado=" + req.estado()
                        + " destinatarios=" + creada.destinatarios()
                        + " programadoPara=" + req.programadoPara(),
                httpReq);
        log.info("[CampanaWhatsapp] Campaña {} creada (estadoEnvio={})", creada.id(), creada.estadoEnvio());
        return ResponseEntity.status(HttpStatus.CREATED).body(creada);
    }

    @GetMapping("/whatsapp")
    public ResponseEntity<Page<CampanaWhatsappDTO>> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(campanaWhatsappService.listar(PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100))));
    }

    private EstadoUsuario parseEstado(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return EstadoUsuario.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
