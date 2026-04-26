package com.plasencia.servicio_mensajeria.controllers;

import com.plasencia.servicio_mensajeria.config.CurrentUser;
import com.plasencia.servicio_mensajeria.config.CurrentUserProvider;
import com.plasencia.servicio_mensajeria.dto.ConversacionDTO;
import com.plasencia.servicio_mensajeria.dto.ConversacionResumenDTO;
import com.plasencia.servicio_mensajeria.dto.CrearConversacionRequest;
import com.plasencia.servicio_mensajeria.entities.Conversacion;
import com.plasencia.servicio_mensajeria.services.ConversacionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/mensajeria/conversaciones")
@RequiredArgsConstructor
public class ConversacionController {

    private final ConversacionService conversacionService;

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

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ConversacionDTO> obtener(@PathVariable Long id) {
        Conversacion c = conversacionService.verificarAcceso(id, CurrentUserProvider.get());
        return ResponseEntity.ok(ConversacionDTO.from(c));
    }
}
