package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.config.CurrentUserProvider;
import com.alquilaya.serviciopropiedades.dto.FavoritoResponseDTO;
import com.alquilaya.serviciopropiedades.services.FavoritoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/favoritos")
@RequiredArgsConstructor
public class FavoritoController {

    private final FavoritoService favoritoService;

    @PostMapping("/{propiedadId}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('AGREGAR_FAVORITOS')")
    public ResponseEntity<Map<String, Object>> toggle(@PathVariable Long propiedadId) {
        boolean agregado = favoritoService.toggle(propiedadId, CurrentUserProvider.get());
        return ResponseEntity.ok(Map.of(
                "propiedadId", propiedadId,
                "favorito", agregado,
                "mensaje", agregado ? "Agregado a favoritos" : "Eliminado de favoritos"
        ));
    }

    @GetMapping("/mis")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<FavoritoResponseDTO>> misFavoritos() {
        return ResponseEntity.ok(favoritoService.listarMis(CurrentUserProvider.get()));
    }

    @GetMapping("/check/{propiedadId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Boolean>> check(@PathVariable Long propiedadId) {
        return ResponseEntity.ok(Map.of(
                "favorito", favoritoService.esFavorito(propiedadId, CurrentUserProvider.get())
        ));
    }
}
