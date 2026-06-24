package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.config.CurrentUser;
import com.alquilaya.serviciopropiedades.config.CurrentUserProvider;
import com.alquilaya.serviciopropiedades.dto.DenunciaDTO;
import com.alquilaya.serviciopropiedades.dto.DenunciaRequest;
import com.alquilaya.serviciopropiedades.enums.EstadoDenuncia;
import com.alquilaya.serviciopropiedades.services.DenunciaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DenunciaController {

    private final DenunciaService denunciaService;

    /** Cualquier usuario autenticado denuncia una publicación. */
    @PostMapping("/propiedades/{id}/denuncias")
    public ResponseEntity<Void> denunciar(@PathVariable Long id, @Valid @RequestBody DenunciaRequest req) {
        CurrentUser cu = CurrentUserProvider.get();
        Long denuncianteId = cu != null ? cu.getPerfilId() : null;
        try {
            denunciaService.crear(id, req.motivo(), req.descripcion(), denuncianteId);
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (IllegalStateException e) {
            // Ya denunció antes: idempotente, no es un error para el usuario.
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    // ===== Admin =====

    @GetMapping("/admin/denuncias")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_DENUNCIAS')")
    public ResponseEntity<Page<DenunciaDTO>> listar(
            @RequestParam(required = false) String estado,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        EstadoDenuncia filtro = parseEstado(estado);
        return ResponseEntity.ok(denunciaService.listar(filtro, PageRequest.of(page, size)));
    }

    @PatchMapping("/admin/denuncias/{denunciaId}")
    @PreAuthorize("@permisoEnforcer.tienePermiso('GESTIONAR_DENUNCIAS')")
    public ResponseEntity<DenunciaDTO> actualizar(
            @PathVariable Long denunciaId,
            @RequestBody Map<String, String> body
    ) {
        String raw = body != null ? body.get("estado") : null;
        EstadoDenuncia nuevo = parseEstado(raw);
        if (nuevo == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado inválido: " + raw);
        }
        return ResponseEntity.ok(denunciaService.actualizarEstado(denunciaId, nuevo));
    }

    private EstadoDenuncia parseEstado(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return EstadoDenuncia.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
