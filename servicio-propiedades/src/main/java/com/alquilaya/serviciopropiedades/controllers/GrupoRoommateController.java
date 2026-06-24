package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.config.CurrentUserProvider;
import com.alquilaya.serviciopropiedades.dto.CrearGrupoRequest;
import com.alquilaya.serviciopropiedades.dto.GrupoRoommateDTO;
import com.alquilaya.serviciopropiedades.services.GrupoRoommateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Grupos de roommates (#38 Fase 1b). */
@RestController
@RequestMapping("/api/v1/grupos")
@RequiredArgsConstructor
public class GrupoRoommateController {

    private final GrupoRoommateService grupoService;

    @PostMapping
    public ResponseEntity<GrupoRoommateDTO> crear(@Valid @RequestBody CrearGrupoRequest req) {
        return ResponseEntity.ok(grupoService.crear(req, CurrentUserProvider.requirePerfilId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GrupoRoommateDTO> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(grupoService.obtener(id));
    }

    /** Grupos abiertos para una propiedad (se muestran en la ficha del depa). */
    @GetMapping("/propiedad/{propiedadId}/abiertos")
    public ResponseEntity<List<GrupoRoommateDTO>> abiertos(@PathVariable Long propiedadId) {
        return ResponseEntity.ok(grupoService.abiertosDePropiedad(propiedadId));
    }

    @GetMapping("/mios")
    public ResponseEntity<List<GrupoRoommateDTO>> mios() {
        return ResponseEntity.ok(grupoService.misGrupos(CurrentUserProvider.requirePerfilId()));
    }

    /** Pedir unirse a un grupo abierto (queda pendiente de aprobación). */
    @PostMapping("/{id}/solicitar")
    public ResponseEntity<GrupoRoommateDTO> solicitar(@PathVariable Long id) {
        return ResponseEntity.ok(grupoService.solicitar(id, CurrentUserProvider.requirePerfilId()));
    }

    /** Unirse directo con el código del link de invitación (sin aprobación). */
    @PostMapping("/unirse")
    public ResponseEntity<GrupoRoommateDTO> unirse(@RequestParam String codigo) {
        return ResponseEntity.ok(grupoService.unirPorCodigo(codigo, CurrentUserProvider.requirePerfilId()));
    }

    /** El creador aprueba a un solicitante. */
    @PostMapping("/{id}/miembros/{estudianteId}/aprobar")
    public ResponseEntity<GrupoRoommateDTO> aprobar(@PathVariable Long id, @PathVariable Long estudianteId) {
        return ResponseEntity.ok(grupoService.aprobar(id, estudianteId, CurrentUserProvider.requirePerfilId()));
    }

    @DeleteMapping("/{id}/salir")
    public ResponseEntity<GrupoRoommateDTO> salir(@PathVariable Long id) {
        return ResponseEntity.ok(grupoService.salir(id, CurrentUserProvider.requirePerfilId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        grupoService.eliminar(id, CurrentUserProvider.requirePerfilId());
        return ResponseEntity.noContent().build();
    }
}
