package com.alquilaya.servicio_mensajeria.controllers;

import com.alquilaya.servicio_mensajeria.config.CurrentUserProvider;
import com.alquilaya.servicio_mensajeria.dto.NotificacionDTO;
import com.alquilaya.servicio_mensajeria.services.NotificacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionService notificacionService;

    @GetMapping("/mis")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<NotificacionDTO>> listarMias(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        return ResponseEntity.ok(notificacionService.listarMias(CurrentUserProvider.get(), pageable));
    }

    @GetMapping("/no-leidas/count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Long>> contarNoLeidas() {
        long total = notificacionService.contarNoLeidas(CurrentUserProvider.get());
        return ResponseEntity.ok(Map.of("count", total));
    }

    @PatchMapping("/{id}/leer")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Boolean>> marcarLeida(@PathVariable Long id) {
        boolean ok = notificacionService.marcarLeida(id, CurrentUserProvider.get());
        return ResponseEntity.ok(Map.of("actualizada", ok));
    }

    @PatchMapping("/leer-todas")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Integer>> marcarTodasLeidas() {
        int n = notificacionService.marcarTodasLeidas(CurrentUserProvider.get());
        return ResponseEntity.ok(Map.of("actualizadas", n));
    }
}
