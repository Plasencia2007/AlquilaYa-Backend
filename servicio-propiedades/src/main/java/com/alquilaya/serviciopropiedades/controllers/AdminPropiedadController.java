package com.alquilaya.serviciopropiedades.controllers;

import com.alquilaya.serviciopropiedades.dto.PropiedadAdminDTO;
import com.alquilaya.serviciopropiedades.entities.Propiedad;
import com.alquilaya.serviciopropiedades.enums.EstadoPropiedad;
import com.alquilaya.serviciopropiedades.repositories.PropiedadRepository;
import com.alquilaya.serviciopropiedades.services.PropiedadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/propiedades")
@RequiredArgsConstructor
public class AdminPropiedadController {

    private final PropiedadRepository propiedadRepository;
    private final PropiedadService propiedadService;

    @GetMapping("/pendientes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PropiedadAdminDTO>> listarPendientes() {
        List<PropiedadAdminDTO> dtos = propiedadRepository
                .findByEstadoOrderByFechaCreacionAsc(EstadoPropiedad.PENDIENTE)
                .stream()
                .map(propiedadService::toAdmin)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PropiedadAdminDTO> verDetalle(@PathVariable Long id) {
        return propiedadRepository.findById(id)
                .map(p -> ResponseEntity.ok(propiedadService.toAdmin(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/aprobar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Propiedad> aprobar(@PathVariable Long id) {
        return propiedadRepository.findById(id)
                .map(p -> {
                    p.setAprobadoPorAdmin(true);
                    p.setEstado(EstadoPropiedad.APROBADO);
                    log.info("[ADMIN] Propiedad {} aprobada", id);
                    return ResponseEntity.ok(propiedadRepository.save(p));
                }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/rechazar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Propiedad> rechazar(@PathVariable Long id) {
        return propiedadRepository.findById(id)
                .map(p -> {
                    p.setAprobadoPorAdmin(false);
                    p.setEstado(EstadoPropiedad.RECHAZADO);
                    log.info("[ADMIN] Propiedad {} rechazada", id);
                    return ResponseEntity.ok(propiedadRepository.save(p));
                }).orElse(ResponseEntity.notFound().build());
    }
}
