package com.alquilaya.servicio_mensajeria.controllers;

import com.alquilaya.servicio_mensajeria.config.CurrentUser;
import com.alquilaya.servicio_mensajeria.config.CurrentUserProvider;
import com.alquilaya.servicio_mensajeria.dto.ConversacionDTO;
import com.alquilaya.servicio_mensajeria.dto.ConversacionResumenDTO;
import com.alquilaya.servicio_mensajeria.dto.CrearConversacionRequest;
import com.alquilaya.servicio_mensajeria.dto.CrearReporteRequest;
import com.alquilaya.servicio_mensajeria.dto.ReporteConversacionDTO;
import com.alquilaya.servicio_mensajeria.entities.Conversacion;
import com.alquilaya.servicio_mensajeria.services.ConversacionService;
import com.alquilaya.servicio_mensajeria.services.ReporteConversacionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/mensajeria/conversaciones")
@RequiredArgsConstructor
public class ConversacionController {

    private final ConversacionService conversacionService;
    private final ReporteConversacionService reporteConversacionService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ConversacionDTO> crearOObtener(@Valid @RequestBody CrearConversacionRequest req) {
        CurrentUser user = CurrentUserProvider.get();
        boolean existia = conversacionService.yaExistia(req, user);
        Conversacion c = conversacionService.crearOObtener(req, user);
        ConversacionDTO dto = ConversacionDTO.from(c);
        return existia ? ResponseEntity.ok(dto) : ResponseEntity.status(201).body(dto);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ConversacionResumenDTO>> listarMias() {
        return ResponseEntity.ok(conversacionService.listarDelUsuario(CurrentUserProvider.get()));
    }

    /** Ítem 262: conversaciones que el caller archivó (soft-delete vía DELETE /{id}). */
    @GetMapping("/archivadas")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ConversacionResumenDTO>> listarArchivadas() {
        return ResponseEntity.ok(conversacionService.listarArchivadasDelUsuario(CurrentUserProvider.get()));
    }

    /**
     * Ítem 264: versión paginada del listado, endpoint nuevo y separado de {@code GET
     * /conversaciones} (ese no se toca: ya lo consumen los badges de no-leídos del dashboard
     * y bottom-nav como una lista completa).
     */
    @GetMapping("/paginadas")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<ConversacionResumenDTO>> listarMiasPaginadas(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        return ResponseEntity.ok(conversacionService.listarDelUsuarioPaginado(CurrentUserProvider.get(), pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ConversacionDTO> obtener(@PathVariable Long id) {
        Conversacion c = conversacionService.verificarAcceso(id, CurrentUserProvider.get());
        return ResponseEntity.ok(ConversacionDTO.from(c));
    }

    /**
     * Soft-delete por participante: la conversación se oculta solo en la lista
     * del caller. Los mensajes permanecen en BD para auditoría. Si la contraparte
     * envía un mensaje nuevo, vuelve a aparecer.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> ocultar(@PathVariable Long id) {
        conversacionService.ocultarParaUsuario(id, CurrentUserProvider.get());
        return ResponseEntity.noContent().build();
    }

    /** Ítem 261: cualquier participante puede reportar la conversación (acoso, fraude...). */
    @PostMapping("/{id}/reportar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReporteConversacionDTO> reportar(@PathVariable Long id,
                                                             @Valid @RequestBody CrearReporteRequest req) {
        ReporteConversacionDTO dto = reporteConversacionService.crear(id, CurrentUserProvider.get(), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }
}
