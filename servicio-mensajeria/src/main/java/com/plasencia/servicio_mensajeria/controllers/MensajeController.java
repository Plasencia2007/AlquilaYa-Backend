package com.plasencia.servicio_mensajeria.controllers;

import com.plasencia.servicio_mensajeria.config.CurrentUserProvider;
import com.plasencia.servicio_mensajeria.dto.CrearMensajeRequest;
import com.plasencia.servicio_mensajeria.dto.MensajeDTO;
import com.plasencia.servicio_mensajeria.services.MensajeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/mensajeria/conversaciones/{id}")
@RequiredArgsConstructor
public class MensajeController {

    private final MensajeService mensajeService;

    @GetMapping("/mensajes")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<MensajeDTO>> listar(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200));
        return ResponseEntity.ok(mensajeService.listarVisibles(id, CurrentUserProvider.get(), pageable));
    }

    @PostMapping("/mensajes")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MensajeDTO> enviar(@PathVariable Long id, @Valid @RequestBody CrearMensajeRequest req) {
        MensajeDTO dto = mensajeService.enviar(id, req, CurrentUserProvider.get());
        return ResponseEntity.status(201).body(dto);
    }

    @PatchMapping("/marcar-leida")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> marcarLeida(@PathVariable Long id) {
        mensajeService.marcarLeidos(id, CurrentUserProvider.get());
        return ResponseEntity.noContent().build();
    }
}
