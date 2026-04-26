package com.plasencia.servicio_mensajeria.controllers;

import com.plasencia.servicio_mensajeria.config.CurrentUserProvider;
import com.plasencia.servicio_mensajeria.dto.AccionModeracionRequest;
import com.plasencia.servicio_mensajeria.dto.ConversacionAdminDTO;
import com.plasencia.servicio_mensajeria.dto.ConversacionDTO;
import com.plasencia.servicio_mensajeria.dto.MensajeDTO;
import com.plasencia.servicio_mensajeria.dto.ModeracionLogDTO;
import com.plasencia.servicio_mensajeria.enums.EstadoConversacion;
import com.plasencia.servicio_mensajeria.enums.TargetModeracion;
import com.plasencia.servicio_mensajeria.repositories.ModeracionLogRepository;
import com.plasencia.servicio_mensajeria.services.ConversacionService;
import com.plasencia.servicio_mensajeria.services.MensajeService;
import com.plasencia.servicio_mensajeria.services.ModeracionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/mensajeria")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ModeracionController {

    private final ModeracionService moderacionService;
    private final ConversacionService conversacionService;
    private final MensajeService mensajeService;
    private final ModeracionLogRepository logRepo;

    @GetMapping("/conversaciones")
    public ResponseEntity<Page<ConversacionAdminDTO>> listarConversaciones(
            @RequestParam(required = false) EstadoConversacion estado,
            @RequestParam(required = false) Long estudianteId,
            @RequestParam(required = false) Long arrendadorId,
            @RequestParam(required = false) Long propiedadId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        return ResponseEntity.ok(
                conversacionService.listarParaAdmin(estado, estudianteId, arrendadorId, propiedadId, pageable));
    }

    @GetMapping("/conversaciones/{id}/mensajes")
    public ResponseEntity<Page<MensajeDTO>> listarMensajesAdmin(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200));
        return ResponseEntity.ok(mensajeService.listarParaAdmin(id, pageable));
    }

    @PostMapping("/mensajes/{id}/bloquear")
    public ResponseEntity<MensajeDTO> bloquear(@PathVariable Long id, @Valid @RequestBody AccionModeracionRequest req) {
        return ResponseEntity.ok(moderacionService.bloquearMensaje(id, req.getMotivo(), CurrentUserProvider.get()));
    }

    @PostMapping("/mensajes/{id}/desbloquear")
    public ResponseEntity<MensajeDTO> desbloquear(@PathVariable Long id, @Valid @RequestBody AccionModeracionRequest req) {
        return ResponseEntity.ok(moderacionService.desbloquearMensaje(id, req.getMotivo(), CurrentUserProvider.get()));
    }

    @PostMapping("/conversaciones/{id}/suspender")
    public ResponseEntity<ConversacionDTO> suspender(@PathVariable Long id, @Valid @RequestBody AccionModeracionRequest req) {
        return ResponseEntity.ok(moderacionService.suspender(id, req.getMotivo(), CurrentUserProvider.get()));
    }

    @PostMapping("/conversaciones/{id}/reactivar")
    public ResponseEntity<ConversacionDTO> reactivar(@PathVariable Long id, @Valid @RequestBody AccionModeracionRequest req) {
        return ResponseEntity.ok(moderacionService.reactivar(id, req.getMotivo(), CurrentUserProvider.get()));
    }

    @GetMapping("/moderacion-log")
    public ResponseEntity<Page<ModeracionLogDTO>> listarLog(
            @RequestParam(required = false) TargetModeracion targetType,
            @RequestParam(required = false) Long targetId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200));
        return ResponseEntity.ok(logRepo.buscar(targetType, targetId, pageable).map(ModeracionLogDTO::from));
    }
}
